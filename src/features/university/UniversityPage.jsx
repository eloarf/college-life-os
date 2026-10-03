import PageHeader from '../../components/PageHeader.jsx';
import ComingSoon from '../../components/ComingSoon.jsx';

export default function UniversityPage() {
  return (
    <>
      <PageHeader eyebrow="Academics" title="University" />
      <ComingSoon emoji="🎓" title="Subjects, attendance, exams">
        Your semester, courses and attendance records will live here.
      </ComingSoon>
    </>
  );
}