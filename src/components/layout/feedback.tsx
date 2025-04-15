import { BrowserClient, getClient } from "@sentry/electron/renderer";
import { MegaphoneIcon } from "@heroicons/react/24/outline";

const Feedback = () => {
  const client = getClient<BrowserClient>();
  const feedback = client?.getIntegrationByName("Feedback");

  return (
    <button
      onClick={async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const form = await ((feedback as any).createForm() as Promise<any>);
        form.appendToDom();
        form.open();
      }}
      className="hover:bg-accent rounded px-3 py-0.5 cursor-pointer flex gap-1 text-muted-foreground items-center"
    >
      <MegaphoneIcon className="inset-0 size-4 overflow-visible"></MegaphoneIcon>
    </button>
  );
};

export default Feedback;
