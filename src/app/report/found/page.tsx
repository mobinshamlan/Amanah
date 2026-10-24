import ReportForm from "@/app/report/ReportForm";

export default function ReportFoundPage() {
  return (
    <ReportForm
      reportType="found"
      eyebrow="Found item report"
      title="Report a found item"
      intro="Tell us what you found and where. Found-item details are kept private and never shown publicly."
      locationLabel="Found location"
      locationHint="Where you found it, for example a building, room, or area."
      locationRequiredMessage="Found location is required."
    />
  );
}
