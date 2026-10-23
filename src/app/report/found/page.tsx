import ReportForm from "@/app/report/ReportForm";

export default function ReportFoundPage() {
  return (
    <ReportForm
      reportType="found"
      title="Report a found item"
      intro="Enter the item details below to submit a found-item report."
      locationLabel="Found location"
      locationRequiredMessage="Found location is required."
    />
  );
}
