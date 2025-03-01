import * as Accordion from "@radix-ui/react-accordion";

export function CustomAccordion({ children }: { children: React.ReactNode }) {
  return (
    <Accordion.Root
      type="single"
      collapsible
      className="w-full border border-gray-700 rounded-lg"
    >
      {children}
    </Accordion.Root>
  );
}

export function CustomAccordionItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Accordion.Item
      value={title}
      className="border-b border-gray-700 last:border-none"
    >
      <Accordion.Trigger className="w-full text-left px-6 py-4 bg-gray-800 text-white cursor-pointer hover:bg-gray-700 transition-all duration-200 ease-in-out rounded-t-lg">
        {title}
      </Accordion.Trigger>
      <Accordion.Content className="p-6 text-sm bg-gray-900 text-gray-300 space-y-3 rounded-b-lg leading-relaxed">
        {children}
      </Accordion.Content>
    </Accordion.Item>
  );
}
