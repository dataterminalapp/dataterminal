import {
  HashIcon,
  TypeIcon,
  CalendarIcon,
  ClockIcon,
  CalendarRangeIcon,
  ToggleLeftIcon,
  CircleDotIcon,
  TextIcon,
  PercentIcon,
  BoxIcon,
  ListOrderedIcon,
  CircleIcon,
  HexagonIcon,
  NetworkIcon,
  FileJsonIcon,
  FileTextIcon,
  BinaryIcon,
} from "lucide-react";

export const dataTypeIcons = {
  integer: { icon: HashIcon, detail: "i" },
  bigint: { icon: HashIcon, detail: "b" },
  smallint: { icon: HashIcon, detail: "s" },
  decimal: { icon: PercentIcon, detail: "d" },
  numeric: { icon: PercentIcon, detail: "n" },
  real: { icon: PercentIcon, detail: "r" },
  "double precision": { icon: PercentIcon, detail: "dp" },
  smallserial: { icon: HashIcon, detail: "ss" },
  serial: { icon: HashIcon, detail: "sr" },
  bigserial: { icon: HashIcon, detail: "bs" },
  varchar: { icon: TypeIcon, detail: "vc" },
  char: { icon: TypeIcon, detail: "c" },
  text: { icon: TextIcon },
  uuid: { icon: HexagonIcon },
  date: { icon: CalendarIcon },
  time: { icon: ClockIcon },
  timestamp: { icon: CalendarRangeIcon, detail: "ts" },
  "timestamp with time zone": { icon: CalendarRangeIcon, detail: "tz" },
  boolean: { icon: ToggleLeftIcon },
  enum: { icon: ListOrderedIcon },
  point: { icon: CircleDotIcon },
  line: { icon: ListOrderedIcon, detail: "ln" },
  lseg: { icon: ListOrderedIcon, detail: "ls" },
  box: { icon: BoxIcon },
  path: { icon: ListOrderedIcon, detail: "p" },
  polygon: { icon: ListOrderedIcon, detail: "pg" },
  circle: { icon: CircleIcon },
  inet: { icon: NetworkIcon, detail: "i" },
  cidr: { icon: NetworkIcon, detail: "c" },
  macaddr: { icon: NetworkIcon, detail: "m" },
  json: { icon: FileJsonIcon },
  jsonb: { icon: FileJsonIcon, detail: "b" },
  xml: { icon: FileTextIcon },
  bytea: { icon: BinaryIcon },
};

export const dataTypeInfo: {
  [type: string]: { initials: string; color: string };
} = {
  integer: { initials: "I", color: "bg-blue-900" },
  bigint: { initials: "BI", color: "bg-blue-900" },
  smallint: { initials: "SI", color: "bg-blue-900" },
  decimal: { initials: "DE", color: "bg-green-900" },
  numeric: { initials: "N", color: "bg-green-900" },
  real: { initials: "R", color: "bg-green-900" },
  "double precision": { initials: "DP", color: "bg-green-900" },
  varchar: { initials: "VC", color: "bg-purple-900" },
  char: { initials: "CH", color: "bg-purple-900" },
  text: { initials: "T", color: "bg-purple-900" },
  uuid: { initials: "ID", color: "bg-yellow-900" },
  date: { initials: "DT", color: "bg-red-900" },
  time: { initials: "TM", color: "bg-red-900" },
  timestamp: { initials: "TS", color: "bg-red-900" },
  "timestamp with time zone": { initials: "TZ", color: "bg-red-900" },
  boolean: { initials: "BL", color: "bg-orange-900" },
  json: { initials: "JS", color: "bg-yellow-900" },
  jsonb: { initials: "JB", color: "bg-yellow-900" },
  array: { initials: "AR", color: "bg-indigo-900" },
};
