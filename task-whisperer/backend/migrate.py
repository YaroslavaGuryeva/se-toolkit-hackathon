"""
One-time migration script to update the database schema.
Adds the category_override column, overdue column, and fixes the FK constraint on task_history.
Run with: python migrate.py
"""
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/task_whisperer")

engine = create_engine(DATABASE_URL)


def run_migrations():
    """Apply all necessary schema changes."""
    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [col["name"] for col in inspector.get_columns("tasks")]

        # 1. Add category_override column if it doesn't exist
        if "category_override" not in columns:
            print("Adding category_override column to tasks table...")
            conn.execute(text(
                "ALTER TABLE tasks ADD COLUMN category_override VARCHAR(50)"
            ))
            conn.commit()
            print("  ✓ Added category_override column")
        else:
            print("  • category_override column already exists")

        # 2. Add overdue column if it doesn't exist
        if "overdue" not in columns:
            print("Adding overdue column to tasks table...")
            conn.execute(text(
                "ALTER TABLE tasks ADD COLUMN overdue BOOLEAN NOT NULL DEFAULT FALSE"
            ))
            conn.commit()
            print("  ✓ Added overdue column")
        else:
            print("  • overdue column already exists")

        # 3. Fix FK constraint on task_history to include ON DELETE CASCADE
        # PostgreSQL doesn't allow ALTERing FK constraints, so we need to drop and recreate
        print("Checking FK constraint on task_history.task_id...")
        constraints = inspector.get_foreign_keys("task_history")
        needs_fix = True
        for constraint in constraints:
            if "options" in constraint and constraint["options"].get("ondelete") == "CASCADE":
                needs_fix = False
                break

        if needs_fix:
            print("  Fixing FK constraint to add ON DELETE CASCADE...")
            conn.execute(text("""
                ALTER TABLE task_history
                DROP CONSTRAINT IF EXISTS task_history_task_id_fkey,
                ADD CONSTRAINT task_history_task_id_fkey
                    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            """))
            conn.commit()
            print("  ✓ Fixed FK constraint")
        else:
            print("  • FK constraint already has ON DELETE CASCADE")

        print("\n✓ All migrations applied successfully!")


if __name__ == "__main__":
    try:
        run_migrations()
    except Exception as e:
        print(f"\n✗ Migration failed: {e}", file=sys.stderr)
        sys.exit(1)
