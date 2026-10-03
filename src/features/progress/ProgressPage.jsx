import PageHeader from '../../components/PageHeader.jsx';
import ComingSoon from '../../components/ComingSoon.jsx';

export default function ProgressPage() {
  return (
    <>
      <PageHeader eyebrow="Growth" title="Progress" />
      <ComingSoon emoji="📈" title="XP, ranks and statistics">
        Your history and achievements will be shown here.
      </ComingSoon>
    </>
  );
}