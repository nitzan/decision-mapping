export type Tool = {
  name: string;
  kind: string;
  about: string;
  href: string;
  external?: boolean;
  download?: boolean;
  slug?: string;
  file?: string;
  preview?: string;
  from?: string;
};

export type Folder = {
  slug: string;
  name: string;
  about: string;
  more?: { label: string; href: string };
  tools: Tool[];
};

export const FOLDERS: Folder[] = [
  {
    slug: "ai-literacy",
    name: "AI Literacy",
    about:
      "Exercises from the AI Literacy workshops: where AI is powerful, where it falls apart, and the difference your judgment makes. One for each workshop.",
    more: { label: "AI Literacy for Teams", href: "https://www.criticalbusinessschool.com/ai-literacy-for-teams/" },
    tools: [
      {
        name: "How many dogs are in Greenpoint?",
        kind: "Fermi estimation",
        about:
          "Break an unknowable question into smaller, estimable pieces, one decision at a time. Shows the difference between a prediction problem and an ambiguity problem in five minutes.",
        href: "https://ai-literacy-salon.netlify.app/",
        external: true,
        from: "Workshop №1 · Prediction",
      },
      {
        name: "The Difference That Makes a Difference",
        kind: "Via negativa",
        about:
          "Chart the figure people mistake you for. Name five things you are not, draw them as a constellation, and share the sky.",
        href: "https://difference.ai-literacy.space/",
        external: true,
        from: "Workshop №2 · Language",
      },
      {
        name: "Levels of Specificity",
        kind: "Drawing exercise",
        about:
          "Write your name and what you do for a living in the outer ring, then keep going deeper, ring by ring. Five or six rings minimum.",
        href: "https://general.ai-literacy.space/",
        external: true,
        from: "Workshop №3 · Computational thinking",
      },
    ],
  },
  {
    slug: "worksheets",
    name: "Worksheets",
    about: "Printable worksheets from the program. Print one, fill it in by hand, and keep it next to your work.",
    tools: [
      {
        name: "Levels of Structure",
        kind: "Worksheet · PDF",
        about:
          "Move from data to information to knowledge. One open field for data, then four cells each for how it is configured and the value in each configuration.",
        href: "/worksheets/levels-of-structure",
        slug: "levels-of-structure",
        file: "/worksheets/levels-of-structure.pdf",
        preview: "/worksheets/levels-of-structure.jpg",
        download: true,
      },
      {
        name: "Space Worksheet",
        kind: "Worksheet · PDF",
        about:
          "Map the places where practice and communication actually happen: synchronous and asynchronous, who is there, and what happens there.",
        href: "/worksheets/space-worksheet",
        slug: "space-worksheet",
        file: "/worksheets/space-worksheet.pdf",
        preview: "/worksheets/space-worksheet.jpg",
        download: true,
      },
      {
        name: "Practice Notebook",
        kind: "Worksheet · PDF",
        about: "A page for naming and tracking your practices: what, who with, how often, and where.",
        href: "/worksheets/practice-notebook",
        slug: "practice-notebook",
        file: "/worksheets/practice-notebook.pdf",
        preview: "/worksheets/practice-notebook.jpg",
        download: true,
      },
    ],
  },
  {
    slug: "in-process",
    name: "In Process",
    about: "Methods from Nitzan Hermon's 1:1 coaching practice, for working through decisions and direction.",
    more: { label: "In Process", href: "https://in-process.net/" },
    tools: [
      {
        name: "Seats at the Table",
        kind: "Decision journey mapping",
        about:
          "List what a decision touches, draw each part as a line between two values, set the balance you want to live within, and see where your options land. Take a snapshot whenever the camera moves.",
        href: "/decisions",
      },
    ],
  },
];
