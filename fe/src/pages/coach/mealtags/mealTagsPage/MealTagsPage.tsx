import { useId, useState, type FormEvent } from "react";
import {
  ApiError,
  createCoachMealTag,
  getCoachMealTags,
  updateCoachMealTag,
  useMutation,
  useQuery,
  type ListedMealTag,
  type MealTagLists,
} from "@api";
import { Button } from "@components/button";
import { ConfirmDialog } from "@components/confirmDialog";
import { PageHeader } from "@components/pageHeader";
import { Skeleton } from "@components/skeleton";
import { toast } from "@components/toast";
import { createSerialQueue } from "@utils/createSerialQueue";
import { moveItemTo } from "@utils/moveItemTo";
import { MealTagRow } from "../mealTagRow";
import { MAX_LIVE_TAGS, MAX_TAG_NAME_LENGTH, archivedUsage, usageList } from "../usage";
import "../../style.css";
import "./style.css";

const WRITE_ERROR = "Impossibile salvare il tag";

type TagWrite =
  | { kind: "rename"; tagId: number; name: string }
  | { kind: "move"; tagId: number; position: number }
  | { kind: "archive"; tagId: number };

const archiveMessage = (tag: ListedMealTag): string => {
  const rule = "Non potrai più sceglierlo per pasti nuovi, e un tag archiviato non torna attivo.";
  const usage = usageList(tag.planCount, tag.templateCount);

  if (usage === null) {
    return rule;
  }

  return `Resta dove è già usato (${usage}). ${rule}`;
};

export function MealTagsPage() {
  const newTagId = useId();
  const [reloadCount, setReloadCount] = useState(0);
  const [newName, setNewName] = useState("");
  const [archiving, setArchiving] = useState<ListedMealTag | null>(null);

  const tags = useQuery({
    queryKey: [reloadCount],
    queryFn: ({ signal }) => getCoachMealTags({ signal }),
    fallback: "Impossibile caricare i tag",
    keepPreviousData: true,
  });

  const reload = () => setReloadCount((count) => count + 1);

  // Moves, renames and archivings are sent one at a time, in the order the coach made them:
  // a move carries a position, which only means something after the moves before it.
  // The list is read again once, when the last one is done.
  const [writeQueue] = useState(() => createSerialQueue(reload));

  const reportWriteError = (error: ApiError) => {
    toast.error(ApiError.messageFrom(error, WRITE_ERROR));

    // The list on screen is stale: another tab archived or renamed the tag.
    if (error.status === 404 || error.status === 409) {
      reload();
    }
  };

  const write = useMutation({
    mutationFn: (tagWrite: TagWrite) => {
      if (tagWrite.kind === "rename") {
        return updateCoachMealTag(tagWrite.tagId, { name: tagWrite.name });
      }

      if (tagWrite.kind === "move") {
        return updateCoachMealTag(tagWrite.tagId, { position: tagWrite.position });
      }

      return updateCoachMealTag(tagWrite.tagId, { archived: true });
    },
    fallback: WRITE_ERROR,
    onSuccess: (_, tagWrite) => {
      if (tagWrite.kind === "archive") {
        toast.success("Tag archiviato");
      }
    },
    // The read after the last write also puts back an order that moved before the answer, and
    // shows what changed in another tab.
    onError: (error) => toast.error(ApiError.messageFrom(error, WRITE_ERROR)),
  });

  const sendWrite = (tagWrite: TagWrite) => writeQueue.add(() => write.mutateAsync(tagWrite));

  const create = useMutation({
    mutationFn: (name: string) => createCoachMealTag(name),
    fallback: WRITE_ERROR,
    onSuccess: () => {
      setNewName("");
      reload();
    },
    onError: reportWriteError,
  });

  const lists = tags.data;
  const liveTags = lists?.mealTags ?? [];
  const archivedTags = lists?.archivedMealTags ?? [];
  const isFull = liveTags.length >= MAX_LIVE_TAGS;

  // The move shows at once; the server rewrites the positions and the reload confirms them.
  const handleMove = (fromIndex: number, toIndex: number) => {
    const movedTag = liveTags[fromIndex];
    tags.setData((current): MealTagLists => ({
      mealTags: moveItemTo(current?.mealTags ?? [], fromIndex, toIndex),
      archivedMealTags: current?.archivedMealTags ?? [],
    }));
    sendWrite({ kind: "move", tagId: movedTag.id, position: toIndex });
  };

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim();

    if (name !== "" && !isFull) {
      create.mutate(name);
    }
  };

  const confirmArchive = () => {
    if (archiving !== null) {
      sendWrite({ kind: "archive", tagId: archiving.id });
    }
    setArchiving(null);
  };

  const renamingTagId =
    write.isPending && write.variables?.kind === "rename" ? write.variables.tagId : null;

  return (
    <div className="meal-tags-page coach-page page-container">
      <PageHeader title="Tag pasti" subtitle="I nomi dei pasti che usi nei piani dei tuoi clienti." />

      {lists === undefined ? (
        <div className="loading" role="status">
          <span className="sr-only">Caricamento…</span>
          <Skeleton height="22rem" />
        </div>
      ) : (
        <>
          <section className="tags-card" aria-labelledby={`${newTagId}-title`}>
            <div className="tags-card__head">
              <h2 id={`${newTagId}-title`} className="tags-card__title">
                I tuoi tag
              </h2>
              <span className="count">
                {liveTags.length} di {MAX_LIVE_TAGS}
              </span>
            </div>
            <p className="intro">
              Ogni pasto del piano ha un tag. L&apos;ordine qui è l&apos;ordine in cui li proponi
              nell&apos;editor.
            </p>

            {liveTags.length === 0 ? (
              <p className="empty">Nessun tag attivo. Aggiungine uno qui sotto.</p>
            ) : (
              <ol className="tags" data-reorder-list>
                {liveTags.map((tag, index) => (
                  <MealTagRow
                    // A rename remounts the row, so its field starts from the new name.
                    key={`${tag.id}-${tag.name}`}
                    tag={tag}
                    index={index}
                    count={liveTags.length}
                    isRenaming={renamingTagId === tag.id}
                    onMove={handleMove}
                    onRename={(name) => sendWrite({ kind: "rename", tagId: tag.id, name })}
                    onArchive={() => setArchiving(tag)}
                  />
                ))}
              </ol>
            )}

            <form className="add" onSubmit={handleCreate}>
              <label htmlFor={newTagId} className="sr-only">
                Nuovo tag
              </label>
              <input
                id={newTagId}
                className="input-base"
                placeholder="Nuovo tag, es. Pre nanna"
                required
                maxLength={MAX_TAG_NAME_LENGTH}
                disabled={isFull}
                aria-describedby={isFull ? `${newTagId}-full` : undefined}
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
              <Button variant="primary" type="submit" disabled={isFull} loading={create.isPending}>
                Aggiungi tag
              </Button>
              {isFull ? (
                <p id={`${newTagId}-full`} className="full">
                  Hai {MAX_LIVE_TAGS} tag, il massimo: archiviane uno per aggiungerne un altro.
                </p>
              ) : null}
            </form>
          </section>

          {archivedTags.length > 0 ? (
            <details className="archived-card" open>
              <summary>Archiviati ({archivedTags.length})</summary>
              <ul className="archived">
                {archivedTags.map((tag) => (
                  <li key={tag.id} className="archived__row">
                    <span className="archived__name">{tag.name}</span>
                    <span className="count">{archivedUsage(tag.planCount, tag.templateCount)}</span>
                  </li>
                ))}
              </ul>
              <p className="intro">
                Un tag archiviato non si può più scegliere, ma i piani e i template che lo usano lo
                tengono.
              </p>
            </details>
          ) : null}
        </>
      )}

      <ConfirmDialog
        isOpen={archiving !== null}
        title={archiving === null ? "" : `Archiviare "${archiving.name}"?`}
        message={archiving === null ? "" : archiveMessage(archiving)}
        confirmLabel="Archivia"
        onConfirm={confirmArchive}
        onCancel={() => setArchiving(null)}
      />
    </div>
  );
}
