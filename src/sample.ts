import type { Trip } from "./types.js";

/**
 * A fully fictional sample trip used by `wayfare init` and the example build.
 * It exercises every block type so the output is a live style reference.
 */
export const SAMPLE_TRIP: Trip = {
  version: 1,
  title: "Lisbon & the *Algarve*",
  kicker: "Sample itinerary",
  subtitle: "Coast, custard tarts, and cliffs",
  start: "2026-09-12",
  end: "2026-09-22",
  currency: "EUR",
  theme: "sand",
  bookings: [
    {
      title: "TAP Air — LIS arrival",
      category: "flight",
      status: "confirmed",
      date: "2026-09-12",
      time: "10:25",
      confirmation: "TP4QX9",
      cost: { amount: 540, currency: "EUR" },
    },
    {
      title: "Casa do Bairro (Alfama)",
      category: "lodging",
      status: "confirmed",
      date: "2026-09-12",
      endDate: "2026-09-16",
      location: "Alfama, Lisbon",
      confirmation: "BK20471",
      cost: { amount: 620, currency: "EUR" },
      links: [{ label: "listing", url: "https://example.com/casa-do-bairro" }],
    },
    {
      title: "Time Out Market dinner",
      category: "dining",
      status: "idea",
      notes: "Go early — it gets packed after 8.",
    },
    {
      title: "Sintra day trip — Pena Palace",
      category: "activity",
      status: "toBook",
      bookBy: "2026-09-10",
      notes: "Buy timed entry online; trains leave from Rossio.",
      links: [{ label: "tickets", url: "https://example.com/pena" }],
    },
    {
      title: "Benagil sea-cave kayak tour",
      category: "activity",
      status: "reserved",
      date: "2026-09-19",
      time: "09:00",
      location: "Algarve",
      balanceDue: { amount: 30, currency: "EUR" },
      cost: { amount: 65, currency: "EUR" },
    },
  ],
  sections: [
    {
      id: "book-next",
      label: "Book Next",
      blocks: [
        { type: "lead", text: "The short list. Everything here needs a decision or a deposit." },
        {
          type: "cards",
          priority: true,
          items: [
            {
              title: "Sintra timed entry",
              badge: "book by Sep 10",
              badgeKind: "book",
              body: "Pena Palace sells out. Grab a morning slot and a return train time.",
              links: [{ label: "tickets", url: "https://example.com/pena" }],
            },
            {
              title: "Pay Benagil balance",
              badge: "reserved",
              badgeKind: "gold",
              body: "€30 balance due at the dock. Bring cash as backup.",
            },
            {
              title: "Algarve car",
              badge: "idea",
              body: "Cheaper to collect at Faro than Lisbon. Decide once dates firm up.",
            },
          ],
        },
        {
          type: "bookingTable",
          filter: { status: ["confirmed", "reserved"] },
        },
      ],
    },
    {
      id: "daily",
      label: "Daily",
      blocks: [
        { type: "heading", text: "Day by day", num: "01" },
        {
          type: "dayGrid",
          days: [
            { date: "2026-09-12", primary: "Land LIS ~10:25 · settle in Alfama", secondary: "Sunset at Miradouro das Portas do Sol", note: "Casa do Bairro check-in 3 PM", kind: "highlight" },
            { date: "2026-09-13", primary: "Alfama + Castelo de São Jorge", secondary: "Fado dinner", note: "walk", kind: "walk" },
            { date: "2026-09-14", primary: "Sintra day trip", secondary: "Pena + Quinta da Regaleira", note: "Pena entry pre-booked" },
            { date: "2026-09-15", primary: "Belém — pastéis + monastery", secondary: "LX Factory evening" },
            { date: "2026-09-16", primary: "Rest / wander", secondary: "Easy night", kind: "rest" },
          ],
        },
      ],
    },
    {
      id: "stays",
      label: "Stays",
      blocks: [
        { type: "lead", text: "Two bases. Tap to compare the rhythm of each." },
        {
          type: "baseSwitcher",
          bases: [
            {
              id: "lisbon",
              label: "Lisbon · Alfama",
              blocks: [
                { type: "bookingTable", variant: "lodging", filter: { category: "lodging" } },
                { type: "callout", text: "Alfama is **steep**. Pack light shoes; the trams fill fast." },
              ],
            },
            {
              id: "algarve",
              label: "Algarve · Lagos",
              blocks: [
                { type: "callout", text: "Move south on **Sep 16**. Pick up the rental car at Faro." },
                {
                  type: "dayGrid",
                  days: [
                    { date: "2026-09-17", primary: "Drive to Lagos · beach", secondary: "Ponta da Piedade at golden hour" },
                    { date: "2026-09-19", primary: "Benagil cave kayak 9 AM", secondary: "Lazy afternoon", note: "balance due at dock" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "food",
      label: "Food",
      blocks: [
        { type: "heading", text: "Eat", num: "02" },
        { type: "bookingTable", variant: "dining", filter: { category: "dining" } },
        { type: "callout", text: "Order a *pastel de nata* warm, with cinnamon. Non-negotiable." },
      ],
    },
    {
      id: "logistics",
      label: "Logistics",
      blocks: [
        { type: "heading", text: "Before you go", num: "03" },
        {
          type: "checklist",
          items: [
            "Download offline maps for Lisbon + Algarve",
            "Add transit card to phone wallet",
            "Confirm Sintra train times",
            "Pay Benagil balance / bring cash",
            "Travel insurance docs saved offline",
          ],
        },
      ],
    },
  ],
};
