import { getCoachAssignments, useQuery, type CoachAssignment } from "@api";

export function useAssignments() {
  const { data, isPending, setData } = useQuery({
    queryFn: getCoachAssignments,
    fallback: "Impossibile caricare le assegnazioni",
  });

  const setAssignments = (
    update:
      | CoachAssignment[]
      | ((prev: CoachAssignment[]) => CoachAssignment[]),
  ) => {
    setData((prev) => {
      const current = prev ?? [];
      return typeof update === "function" ? update(current) : update;
    });
  };

  return { assignments: data ?? [], setAssignments, loading: isPending };
}
