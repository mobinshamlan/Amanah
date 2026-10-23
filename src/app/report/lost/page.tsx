"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type FieldErrors = {
  itemName?: string;
  description?: string;
  location?: string;
};

export default function ReportLostPage() {
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);

    const nextErrors: FieldErrors = {};

    if (!itemName.trim()) {
      nextErrors.itemName = "Item name is required.";
    }
    if (!description.trim()) {
      nextErrors.description = "Description is required.";
    }
    if (!location.trim()) {
      nextErrors.location = "Last-seen location is required.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSuccessMessage("Form checked successfully. Saving comes next.");
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-10">
      <Link href="/" className="text-teal-800 underline">
        Back to home
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Report a lost item
        </h1>
        <p className="text-zinc-600">
          Enter the item details below. Nothing is saved yet.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="itemName" className="font-medium text-zinc-900">
            Item name
          </label>
          <input
            id="itemName"
            name="itemName"
            type="text"
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            className="rounded border border-zinc-300 px-3 py-2"
            aria-invalid={Boolean(errors.itemName)}
            aria-describedby={errors.itemName ? "itemName-error" : undefined}
          />
          {errors.itemName ? (
            <p id="itemName-error" className="text-sm text-red-700">
              {errors.itemName}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="font-medium text-zinc-900">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="rounded border border-zinc-300 px-3 py-2"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "description-error" : undefined
            }
          />
          {errors.description ? (
            <p id="description-error" className="text-sm text-red-700">
              {errors.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="location" className="font-medium text-zinc-900">
            Last-seen location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="rounded border border-zinc-300 px-3 py-2"
            aria-invalid={Boolean(errors.location)}
            aria-describedby={errors.location ? "location-error" : undefined}
          />
          {errors.location ? (
            <p id="location-error" className="text-sm text-red-700">
              {errors.location}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          className="rounded-lg bg-teal-700 px-5 py-3 font-medium text-white"
        >
          Check form
        </button>
      </form>

      {successMessage ? (
        <p className="rounded border border-teal-200 bg-teal-50 px-3 py-2 text-teal-900">
          {successMessage}
        </p>
      ) : null}
    </main>
  );
}
