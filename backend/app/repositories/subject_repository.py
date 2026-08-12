from typing import Optional

from sqlalchemy.orm import Session

from app.models.subject import Subject


class SubjectRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> list[Subject]:
        return self.db.query(Subject).order_by(Subject.subject_id).all()

    def get_by_id(self, subject_id: int) -> Optional[Subject]:
        return self.db.query(Subject).filter(Subject.subject_id == subject_id).first()

    def get_by_code(self, code: str) -> Optional[Subject]:
        return self.db.query(Subject).filter(Subject.code == code).first()

    def count(self) -> int:
        return self.db.query(Subject).count()

    def create(self, **fields) -> Subject:
        subject = Subject(**fields)
        self.db.add(subject)
        self.db.commit()
        self.db.refresh(subject)
        return subject

    def update(self, subject: Subject, **fields) -> Subject:
        for key, value in fields.items():
            if value is not None:
                setattr(subject, key, value)
        self.db.commit()
        self.db.refresh(subject)
        return subject

    def delete(self, subject: Subject) -> None:
        self.db.delete(subject)
        self.db.commit()
