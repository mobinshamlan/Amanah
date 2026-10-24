import ReportForm from "@/app/report/ReportForm";

export default function ReportLostPage() {
  return (
    <ReportForm
      reportType="lost"
      eyebrow="Lost item report"
      title="Report a lost item"
      intro="Describe the item in your own words. You will not see any found items; Amanah checks for a possible match privately."
      locationLabel="Last-seen location"
      locationHint="Where you last had it, for example a building, room, or area."
      locationRequiredMessage="Last-seen location is required."
      nextSteps={[
        "Your report is saved and you get a private tracking link.",
        "Amanah privately checks found-item reports for a possible match.",
        "If there is a possible match, you answer a few neutral questions and staff review your claim.",
      ]}
    />
  );
}
