import {
  BoxIcon,
  ComponentBooleanIcon,
  QuestionMarkIcon,
  SewingPinIcon,
} from "@radix-ui/react-icons";
import {
  Hash,
  Binary,
  Network,
  Calendar,
  Clock,
  BracesIcon,
  LineChart,
  DollarSign,
  Route,
  FileCode,
  Pentagon,
  Type,
  Search,
  Key,
  CodeXml,
  Brackets,
} from "lucide-react";

const iconClassname = "size-3.5 stroke-1 shrink-0";

export const typeToIcon: { [type: string]: JSX.Element } = {
  array: <Brackets className={iconClassname} />,
  ARRAY: <Brackets className={iconClassname} />,

  // Numeric Types
  bigint: <Hash className={iconClassname} />,
  integer: <Hash className={iconClassname} />,
  smallint: <Hash className={iconClassname} />,
  numeric: <Hash className={iconClassname} />,
  "double precision": <Hash className={iconClassname} />,
  real: <Hash className={iconClassname} />,
  decimal: <Hash className={iconClassname} />,

  // Monetary types
  money: <DollarSign className={iconClassname} />,

  // Character Types
  character: <Type className={iconClassname} />,
  "character varying": <Type className={iconClassname} />,
  varchar: <Type className={iconClassname} />, // Alias for character varying
  text: <Type className={iconClassname} />,
  char: <Type className={iconClassname} />, // Alias for character
  // Extrange case found in some queries like in `\l` meta-command
  '"char"': <Type className={iconClassname} />, // Alias for character
  bpchar: <Type className={iconClassname} />,
  name: <Type className={iconClassname} />,

  // Binary Types
  bit: <Binary className={iconClassname} />,
  "bit varying": <Binary className={iconClassname} />,
  bytea: <Binary className={iconClassname} />,

  // Boolean Type
  boolean: <ComponentBooleanIcon className={iconClassname} />,

  // Date/Time Types
  date: <Calendar className={iconClassname} />,
  interval: <Clock className={iconClassname} />,
  time: <Clock className={iconClassname} />,
  "time with time zone": <Clock className={iconClassname} />,
  timestamp: <Clock className={iconClassname} />,
  "timestamp with time zone": <Clock className={iconClassname} />,
  "timestamp without time zone": <Clock className={iconClassname} />,

  // Network Address Types
  cidr: <Network className={iconClassname} />,
  inet: <Network className={iconClassname} />,
  macaddr: <Network className={iconClassname} />,
  macaddr8: <Network className={iconClassname} />,

  // Geometric Types
  box: <BoxIcon className={iconClassname} />,
  circle: <SewingPinIcon className={iconClassname} />,
  line: <LineChart className={iconClassname} />,
  lseg: <LineChart className={iconClassname} />,
  path: <Route className={iconClassname} />,
  point: <SewingPinIcon className={iconClassname} />,
  polygon: <Pentagon className={iconClassname} />,

  // JSON Types
  json: <BracesIcon className={iconClassname} />,
  jsonb: <BracesIcon className={iconClassname} />,

  // Other Types
  pg_lsn: <FileCode className={iconClassname} />,
  tsquery: <Search className={iconClassname} />,
  tsvector: <Search className={iconClassname} />,
  txid_snapshot: <Key className={iconClassname} />,
  uuid: <Key className={iconClassname} />,
  xml: <CodeXml className={iconClassname} />,

  // User defined
  "USER-DEFINED": <QuestionMarkIcon className={iconClassname} />,
};
