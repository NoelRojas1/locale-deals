import { env } from "@/data/env/client";

export default function Banner({
  message,
  mappings,
  customization,
  canRemoveBranding,
}: {
  canRemoveBranding: boolean;
  mappings: {
    coupon: string;
    discount: string;
    country: string;
  };
  message: string;
  customization: {
    backgroundColor: string;
    textColor: string;
    fontSize: string;
    isSticky: boolean;
    classPrefix?: string | null;
  };
}) {
  const prefix = customization.classPrefix ?? "";
  const mappedMessage = Object.entries(mappings).reduce(
    (mappedMessage, [key, value]) => {
      return mappedMessage.replace(new RegExp(`{${key}}`, "g"), value);
    },
    message.replace(/'/g, "&#39;")
  );

  return (
    <>
      <style type="text/css">{`
        .${prefix}locale-deals-container {
          all: revert;
          display: flex;
          flex-direction: column;
          gap: .5em;
          background-color: ${customization.backgroundColor};
          color: ${customization.textColor};
          font-size: ${customization.fontSize};
          font-family: inherit;
          padding: 1rem;
          ${customization.isSticky ? "position: sticky;" : ""}
          left: 0;
          right: 0;
          top: 0;
          text-wrap: balance;
          text-align: center;
        }

        .${prefix}locale-deals-branding {
          color: inherit;
          font-size: inherit;
          display: inline-block;
          text-decoration: underline;
        }
      `}</style>

      <div
        className={`${prefix}locale-deals-container ${prefix}locale-deals-override`}
      >
        <span
          className={`${prefix}locale-deals-message ${prefix}locale-deals-override`}
          dangerouslySetInnerHTML={{ __html: mappedMessage }}
        />
        {!canRemoveBranding && (
          <a
            href={`${env.NEXT_PUBLIC_SERVER_URL}`}
            className={`${prefix}locale-deals-branding`}
          >
            Powered by Locale Deals
          </a>
        )}
      </div>
    </>
  );
}
