import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export function usePrice() {
  return useQuery({
    queryKey: ["price"],
    queryFn: api.getPrice,
    refetchInterval: 1000,
  });
}
