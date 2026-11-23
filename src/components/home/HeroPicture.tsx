import { getImageProps } from "next/image";

/*
  The desk, art-directed: one render for wide screens (objects on one side,
  calm space on the other for the headline) and one for phones (objects
  centred). Both go through next/image's loader; a <picture> element picks
  one, so a phone never downloads the wide render. The wide render is
  mirrored on Arabic pages so its calm side sits under the headline.
*/
const WIDE_BREAKPOINT = "(min-width: 1024px)";

export function HeroPicture({ alt }: { alt: string }) {
  const common = { alt, priority: true } as const;
  const wide = getImageProps({
    ...common,
    src: "/art/hero-desk.jpg",
    width: 2560,
    height: 1440,
    sizes: "100vw",
  });
  const phone = getImageProps({
    ...common,
    src: "/art/hero-desk-mobile.jpg",
    width: 1200,
    height: 1000,
    sizes: "100vw",
  });

  return (
    <picture className="contents">
      <source media={WIDE_BREAKPOINT} srcSet={wide.props.srcSet} sizes="100vw" />
      <img
        {...phone.props}
        alt={alt}
        fetchPriority="high"
        className="home-settle absolute inset-0 size-full object-cover object-center lg:rtl:-scale-x-100"
      />
    </picture>
  );
}
