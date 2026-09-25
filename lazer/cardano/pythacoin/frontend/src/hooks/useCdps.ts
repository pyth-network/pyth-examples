import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export function useCdps() {
  return useQuery({
    queryKey: ["cdps"],
    queryFn: api.listCdps,
    refetchInterval: 5_000,
  });
}
