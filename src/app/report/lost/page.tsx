import ReportForm from "@/app/report/ReportForm";

export default function ReportLostPage() {
  return (
    <ReportForm
      reportType="lost"
      title="Report a lost item"
      intro="Enter the item details below to submit a lost-item report."
      locationLabel="Last-seen location"
      locationRequiredMessage="Last-seen location is required."
    />
  );
}
