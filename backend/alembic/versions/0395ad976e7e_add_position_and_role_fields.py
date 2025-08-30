"""add_position_and_role_fields

Revision ID: 0395ad976e7e
Revises: 23891b733c83
Create Date: 2025-08-30 08:42:36.799330

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0395ad976e7e'
down_revision: Union[str, Sequence[str], None] = '23891b733c83'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add position and role columns to match_participants table
    op.add_column('match_participants', sa.Column('team_position', sa.String(), nullable=True))
    op.add_column('match_participants', sa.Column('individual_position', sa.String(), nullable=True))
    op.add_column('match_participants', sa.Column('role', sa.String(), nullable=True))
    op.add_column('match_participants', sa.Column('lane', sa.String(), nullable=True))
    
    # Add index on team_position for role-based queries
    op.create_index('ix_match_participants_team_position', 'match_participants', ['team_position'])


def downgrade() -> None:
    """Downgrade schema."""
    # Remove index and columns
    op.drop_index('ix_match_participants_team_position', 'match_participants')
    op.drop_column('match_participants', 'lane')
    op.drop_column('match_participants', 'role')
    op.drop_column('match_participants', 'individual_position')
    op.drop_column('match_participants', 'team_position')
