import PageHeader from '../../components/PageHeader.jsx';
import ComingSoon from '../../components/ComingSoon.jsx';

export default function HabitsPage() {
  return (
    <>
      <PageHeader eyebrow="Routine" title="Habits" />
      <ComingSoon emoji="🔥" title="Create your first habit">
        Measurable habits with real day-by-day streaks are coming.
      </ComingSoon>
    </>
  );
}