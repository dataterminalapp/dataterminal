import React from "react";

import {
  AWSIcon,
  AzureIcon,
  GCPIcon,
  NeonIcon,
  PostgresIcon,
  SupabaseIcon,
  TimescaleIcon,
  YugabyteIcon,
} from "./logos";
import { cn } from "@/lib/utils";
import { Provider } from "@/features/connections";

const providerIcons: { [key in Provider]: JSX.Element } = {
  Neon: NeonIcon,
  Supabase: SupabaseIcon,
  AWS: AWSIcon,
  GCP: GCPIcon,
  Azure: AzureIcon,
  Yugabyte: YugabyteIcon,
  Timescale: TimescaleIcon,
  Quest: <></>,
  Postgres: PostgresIcon,
};

interface Props {
  className?: string;
  provider?: Provider;
}

const ProviderIcon = ({ className, provider }: Props): JSX.Element => {
  const iconComp =
    provider && (providerIcons[provider] || providerIcons["Postgres"]);

  if (iconComp) {
    return React.cloneElement(iconComp, {
      className: cn(iconComp.props.className, "grayscale", className),
    });
  }
  return <></>;
};

export default ProviderIcon;
