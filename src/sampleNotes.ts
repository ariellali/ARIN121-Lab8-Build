export interface SampleNote {
  title: string;
  category: string;
  content: string;
}

export const SAMPLE_NOTES: SampleNote[] = [
  {
    title: 'Cellular Respiration & ATP',
    category: 'Biology',
    content: `Cellular respiration is a metabolic pathway that breaks down glucose and produces ATP. The stages include glycolysis, pyruvate oxidation, the citric acid (Krebs) cycle, and oxidative phosphorylation.

Glycolysis takes place in the cytosol and is anaerobic, producing a net gain of 2 ATP and 2 NADH molecules per glucose. Pyruvate is then transported into the mitochondrial matrix where it is converted into Acetyl-CoA by pyruvate dehydrogenase, releasing CO2.

In the citric acid cycle, Acetyl-CoA combines with oxacetate to form citrate. For each turn, the cycle produces 3 NADH, 1 FADH2, and 1 GTP (convertible to ATP).

The majority of ATP is synthesized during oxidative phosphorylation across the inner mitochondrial membrane via the electron transport chain and ATP synthase driven by a proton gradient (chemiosmosis). Cyanide inhibits cytochrome c oxidase (complex IV), which halts the electron transport chain and prevents ATP synthesis.`,
  },
  {
    title: 'Operating Systems & Virtual Memory',
    category: 'Computer Science',
    content: `In modern operating systems, virtual memory provides an abstraction of physical memory, giving each process its own contiguous virtual address space.

The Memory Management Unit (MMU) translates virtual addresses into physical addresses using page tables. A page fault occurs when a program attempts to access a memory page that is mapped in virtual address space but is not currently loaded into physical RAM.

When a page fault triggers, the operating system pauses the process, locates the required page in secondary storage (swap/paging file), copies it into an available RAM frame, updates the page table, and resumes process execution.

Thrashing is a critical state where the operating system spends more time servicing page faults and swapping pages in and out than executing instructions, caused when active processes demand more physical RAM than is available. The Translation Lookaside Buffer (TLB) is a high-speed hardware cache that stores recent virtual-to-physical translations to reduce memory access latency.`,
  },
  {
    title: 'Monetary Policy & Inflation',
    category: 'Economics',
    content: `Central banks utilize monetary policy to influence economic activity, unemployment, and price stability. The primary conventional tool is manipulation of the benchmark policy interest rate.

When inflation rises above target levels, the central bank implements contractionary monetary policy by raising nominal interest rates. Higher interest rates elevate borrowing costs for commercial loans and mortgages, which cools consumer spending, dampens business capital investment, and slows aggregate demand to relieve inflationary pressures.

Open market operations involve the buying or selling of government bonds by the central bank to adjust the quantity of reserves in the commercial banking system. Quantitative easing is an unconventional policy deployed when interest rates reach the zero lower bound, involving large-scale purchases of longer-term securities to depress long-term yields.`,
  },
];
