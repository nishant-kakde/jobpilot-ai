"""add_advanced_ai_tables

Revision ID: 93f10a82d001
Revises: 82e99b91005e
Create Date: 2026-11-04 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import app.models.encrypted_type


# revision identifiers, used by Alembic.
revision: str = '93f10a82d001'
down_revision: Union[str, None] = '82e99b91005e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # conversations
    op.create_table(
        'conversations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('job_id', sa.String(length=36), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conversations_user_id'), 'conversations', ['user_id'], unique=False)

    # conversation_messages
    op.create_table(
        'conversation_messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('conversation_id', sa.String(length=36), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('provider_used', sa.String(length=50), nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conversation_messages_conversation_id'), 'conversation_messages', ['conversation_id'], unique=False)

    # interview_sessions
    op.create_table(
        'interview_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('job_id', sa.String(length=36), nullable=True),
        sa.Column('application_id', sa.String(length=36), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('target_role', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('overall_score', sa.Float(), nullable=True),
        sa.Column('technical_score', sa.Float(), nullable=True),
        sa.Column('communication_score', sa.Float(), nullable=True),
        sa.Column('star_score', sa.Float(), nullable=True),
        sa.Column('feedback_summary', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_interview_sessions_user_id'), 'interview_sessions', ['user_id'], unique=False)

    # mock_interview_answers
    op.create_table(
        'mock_interview_answers',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('candidate_answer', sa.Text(), nullable=False),
        sa.Column('overall_score', sa.Float(), nullable=True),
        sa.Column('technical_accuracy_score', sa.Float(), nullable=True),
        sa.Column('communication_score', sa.Float(), nullable=True),
        sa.Column('star_framework_score', sa.Float(), nullable=True),
        sa.Column('strengths', sa.JSON(), nullable=True),
        sa.Column('areas_for_improvement', sa.JSON(), nullable=True),
        sa.Column('improved_model_answer', sa.Text(), nullable=True),
        sa.Column('actionable_tip', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mock_interview_answers_session_id'), 'mock_interview_answers', ['session_id'], unique=False)

    # career_roadmaps
    op.create_table(
        'career_roadmaps',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('target_role', sa.String(length=255), nullable=False),
        sa.Column('readiness_score', sa.Float(), nullable=True),
        sa.Column('weekly_hours', sa.Integer(), nullable=True),
        sa.Column('critical_skill_gaps', sa.JSON(), nullable=True),
        sa.Column('milestones_30_days', sa.JSON(), nullable=True),
        sa.Column('milestones_60_days', sa.JSON(), nullable=True),
        sa.Column('milestones_90_days', sa.JSON(), nullable=True),
        sa.Column('portfolio_projects', sa.JSON(), nullable=True),
        sa.Column('interview_readiness_plan', sa.JSON(), nullable=True),
        sa.Column('progress_percentage', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_career_roadmaps_user_id'), 'career_roadmaps', ['user_id'], unique=False)

    # ai_provider_settings
    op.create_table(
        'ai_provider_settings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('selected_provider', sa.String(length=50), nullable=True),
        sa.Column('openai_model', sa.String(length=100), nullable=True),
        sa.Column('gemini_model', sa.String(length=100), nullable=True),
        sa.Column('anthropic_model', sa.String(length=100), nullable=True),
        sa.Column('custom_api_key_encrypted', app.models.encrypted_type.EncryptedString(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )


def downgrade() -> None:
    op.drop_table('ai_provider_settings')
    op.drop_index(op.f('ix_career_roadmaps_user_id'), table_name='career_roadmaps')
    op.drop_table('career_roadmaps')
    op.drop_index(op.f('ix_mock_interview_answers_session_id'), table_name='mock_interview_answers')
    op.drop_table('mock_interview_answers')
    op.drop_index(op.f('ix_interview_sessions_user_id'), table_name='interview_sessions')
    op.drop_table('interview_sessions')
    op.drop_index(op.f('ix_conversation_messages_conversation_id'), table_name='conversation_messages')
    op.drop_table('conversation_messages')
    op.drop_index(op.f('ix_conversations_user_id'), table_name='conversations')
    op.drop_table('conversations')

