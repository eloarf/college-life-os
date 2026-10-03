import PageHeader from '../../components/PageHeader.jsx';
import ComingSoon from '../../components/ComingSoon.jsx';

export default function CalendarPage() {
  return (
    <>
      <PageHeader eyebrow="Plan" title="Calendar" />
      <ComingSoon emoji="🗓️" title="Month, week and day views">
        A real calendar with classes, deadlines and consistency marks is coming.
      </ComingSoon>
    </>
  );
}