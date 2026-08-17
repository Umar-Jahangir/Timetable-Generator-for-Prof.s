from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.division import Division
from app.models.room import Room, RoomType
from app.models.subject_faculty_assignment import DeliveryType, SubjectFacultyAssignment
from app.models.time_slot import DayOfWeek, TimeSlot
from app.models.timetable_entry import TimetableEntry
from app.schemas.free_rooms import FreeRoomOut, FreeRoomsOut, RoomReservationCreate


class RoomAvailabilityService:
    """Date-aware availability for a recurring timetable plus one-time extras."""

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _day_for_date(value: date) -> DayOfWeek:
        try:
            return DayOfWeek(value.strftime("%A"))
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Reservations can only be made from Monday through Saturday.",
            ) from exc

    def _slots(self, scheduled_date: date) -> list[TimeSlot]:
        day = self._day_for_date(scheduled_date)
        return (
            self.db.query(TimeSlot)
            .filter(TimeSlot.day_of_week == day, TimeSlot.is_break.is_(False))
            .order_by(TimeSlot.slot_order)
            .all()
        )

    def _entries_for_date(self, scheduled_date: date):
        day = self._day_for_date(scheduled_date)
        return (
            self.db.query(TimetableEntry)
            .join(TimeSlot, TimetableEntry.time_slot_id == TimeSlot.time_slot_id)
            .filter(
                TimetableEntry.is_active.is_(True),
                (
                    (TimetableEntry.scheduled_date.is_(None) & (TimeSlot.day_of_week == day))
                    | (TimetableEntry.scheduled_date == scheduled_date)
                ),
            )
            .all()
        )

    def free_rooms(self, scheduled_date: date) -> FreeRoomsOut:
        slots = self._slots(scheduled_date)
        rooms = self.db.query(Room).filter(Room.is_active.is_(True)).order_by(Room.name).all()
        occupied = {(entry.room_id, entry.time_slot_id) for entry in self._entries_for_date(scheduled_date) if entry.room_id}

        available: list[FreeRoomOut] = []
        for slot in slots:
            for room in rooms:
                if (room.room_id, slot.time_slot_id) in occupied:
                    continue
                available.append(
                    FreeRoomOut(
                        room_id=room.room_id,
                        room_name=room.name,
                        room_type=room.room_type,
                        capacity=room.capacity,
                        time_slot_id=slot.time_slot_id,
                        start_time=slot.start_time,
                        end_time=slot.end_time,
                        slot_order=slot.slot_order,
                        is_one_hour_lab=room.room_type == RoomType.laboratory
                        and not self._has_consecutive_free_lab_slot(room.room_id, slot, slots, occupied),
                    )
                )
        return FreeRoomsOut(
            date=scheduled_date,
            day=self._day_for_date(scheduled_date).value,
            rooms_by_slot=available,
        )

    @staticmethod
    def _has_consecutive_free_lab_slot(
        room_id: int,
        slot: TimeSlot,
        slots: list[TimeSlot],
        occupied: set[tuple[int, int]],
    ) -> bool:
        next_slot = next((candidate for candidate in slots if candidate.slot_order == slot.slot_order + 1), None)
        return bool(next_slot and (room_id, next_slot.time_slot_id) not in occupied)

    def validate_reservation(self, faculty_id: int, payload: RoomReservationCreate) -> tuple[Room, TimeSlot]:
        if payload.scheduled_date < date.today():
            raise HTTPException(status_code=422, detail="Choose today or a future date.")
        slots = self._slots(payload.scheduled_date)
        slot = next((candidate for candidate in slots if candidate.time_slot_id == payload.time_slot_id), None)
        if not slot:
            raise HTTPException(status_code=422, detail="That time slot does not belong to the selected date.")
        room = self.db.query(Room).filter(Room.room_id == payload.room_id, Room.is_active.is_(True)).first()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found.")

        assignment = (
            self.db.query(SubjectFacultyAssignment)
            .filter(
                SubjectFacultyAssignment.faculty_id == faculty_id,
                SubjectFacultyAssignment.subject_id == payload.subject_id,
                SubjectFacultyAssignment.division_id == payload.division_id,
            )
            .first()
        )
        if not assignment:
            raise HTTPException(status_code=403, detail="You are not assigned to teach that subject for this division.")

        expected_type = {
            DeliveryType.theory: RoomType.classroom,
            DeliveryType.tutorial: RoomType.tutorial,
            DeliveryType.lab: RoomType.laboratory,
        }[assignment.delivery_type]
        if room.room_type != expected_type:
            raise HTTPException(
                status_code=422,
                detail=f"This subject requires a {expected_type.value} room.",
            )

        entries = self._entries_for_date(payload.scheduled_date)
        for entry in entries:
            if entry.time_slot_id != slot.time_slot_id:
                continue
            if entry.faculty_id == faculty_id:
                raise HTTPException(status_code=409, detail="You are not free at this time.")
            if entry.division_id == payload.division_id:
                raise HTTPException(status_code=409, detail="Students in this division are not free at this time.")
            if entry.room_id == room.room_id:
                raise HTTPException(status_code=409, detail="This room is no longer free at this time.")

        if expected_type == RoomType.laboratory and not self._has_consecutive_free_lab_slot(
            room.room_id,
            slot,
            slots,
            {(entry.room_id, entry.time_slot_id) for entry in entries if entry.room_id},
        ):
            raise HTTPException(
                status_code=422,
                detail="This laboratory is free for only one hour. A lab reservation requires two consecutive hours.",
            )
        return room, slot
