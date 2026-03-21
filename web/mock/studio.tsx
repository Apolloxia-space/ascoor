import type { ReactNode } from 'react';
import { BoxSelect, Eye, Orbit, RefreshCw, SquareMenu } from 'lucide-react';

export type Project = { name: string; path: string };

export type ChatMessage = {
  id: string;
  author: 'user' | 'ai';
  content: string;
  showCodeButton?: boolean;
};

export type CodeLine = {
  number: number;
  content: ReactNode;
  indent?: number;
  isError?: boolean;
};

export const recentProjects: Array<Project> = [
  { name: 'Mechanical Arm Base', path: '~/Documents/STUDIO_AI/Mechanical-Arm-Base' },
  { name: 'Drone Assembly', path: '~/Documents/STUDIO_AI/drone-assembly' },
  { name: 'Electronics Enclosure', path: '~/Downloads/electronics-enclosure-v2' },
  { name: 'Phone Stand', path: '~/Documents/STUDIO_AI/prototypes/phone-stand' },
];

export const codeLines: Array<CodeLine> = [
  {
    number: 1,
    content: (
      <>
        <span className="text-purple-300">const</span> baseDiameter ={' '}
        <span className="text-emerald-300">80;</span>
      </>
    ),
  },
  {
    number: 2,
    content: (
      <>
        <span className="text-purple-300">const</span> baseHeight ={' '}
        <span className="text-emerald-300">10;</span>
      </>
    ),
  },
  {
    number: 3,
    content: (
      <>
        <span className="text-purple-300">const</span> holeRadius ={' '}
        <span className="text-emerald-300">5;</span>
      </>
    ),
  },
  {
    number: 4,
    content: <span className="text-slate-500">{'// Build main mesh'}</span>,
  },
  {
    number: 5,
    content: (
      <>
        <span className="text-purple-300">const</span> base ={' '}
        <span className="text-purple-300">new</span> THREE.Mesh(
      </>
    ),
  },
  {
    number: 6,
    content: (
      <>
        <span className="text-purple-300">new</span> THREE.CylinderGeometry(baseDiameter /{' '}
        <span className="text-emerald-300">2</span>, baseDiameter /{' '}
        <span className="text-emerald-300">2</span>, baseHeight,{' '}
        <span className="text-emerald-300">64</span>),
      </>
    ),
    indent: 1,
  },
  {
    number: 7,
    content: (
      <>
        <span className="text-purple-300">new</span> THREE.MeshStandardMaterial(
        <span>{`{ color: 0x8aa2ff }`}</span>)
      </>
    ),
    indent: 1,
  },
  {
    number: 8,
    content: <>);</>,
  },
  {
    number: 9,
    content: <span className="text-slate-500">{'// Add a center hole marker'}</span>,
  },
  {
    number: 10,
    content: (
      <>
        <span className="text-purple-300">const</span> marker ={' '}
        <span className="text-purple-300">new</span> THREE.Mesh(
      </>
    ),
  },
  {
    number: 11,
    content: (
      <>
        <span className="text-purple-300">new</span> THREE.CylinderGeometry(holeRadius, holeRadius,
        baseHeight + <span className="text-emerald-300">2</span>,{' '}
        <span className="text-emerald-300">32</span>),
      </>
    ),
    indent: 1,
  },
  {
    number: 12,
    content: (
      <>
        <span className="text-purple-300">new</span> THREE.MeshBasicMaterial(
        <span>{`{ color: 0xff6b6b }`}</span>)
      </>
    ),
    indent: 1,
    isError: true,
  },
  {
    number: 13,
    content: <span>;</span>,
    isError: true,
  },
  {
    number: 14,
    content: <span>base.add(marker))</span>,
    isError: true,
  },
  {
    number: 15,
    content: (
      <>
        <span className="text-purple-300">const</span> result = base;
      </>
    ),
  },
];

export const generatedCode = `const geometry = new THREE.BoxGeometry(10, 10, 10);
const material = new THREE.MeshStandardMaterial({ color: 0x6ea8fe });
const mesh = new THREE.Mesh(geometry, material);
mesh.position.set(0, 5, 0);
const result = mesh;`;

export const chatMessages: Array<ChatMessage> = [
  {
    id: 'm1',
    author: 'user',
    content: 'Create a 10x10x10 cube with a 2 unit hole through the center',
  },
  {
    id: 'm2',
    author: 'ai',
    content: 'Generated a 10x10x10 cube with a 2 unit diameter hole through the center.',
    showCodeButton: true,
  },
  {
    id: 'm3',
    author: 'user',
    content: 'Make it twice as big.',
  },
  {
    id: 'm4',
    author: 'ai',
    content: 'Got it. I doubled all dimensions.',
    showCodeButton: true,
  },
];

export const viewModes = [
  { key: 'solid', label: 'Solid', Icon: BoxSelect },
  { key: 'shaded', label: 'Shaded', Icon: Orbit },
  { key: 'wireframe', label: 'Wireframe', Icon: SquareMenu },
  { key: 'translucent', label: 'Translucent', Icon: Eye },
  { key: 'xray', label: 'X-Ray', Icon: RefreshCw },
] as const;

export const errorLine = 14;
export const errorTitle = "SyntaxError: Unexpected token ')'";
export const errorDetail = 'Unexpected token while adding marker mesh to base.';
