import { useId, useState } from "react";
import { Search } from "lucide-react";
import { filterEquipment } from "../domain/equipmentSearch";
import {
  changeEquipmentSelection,
  equipmentChoices,
  NO_EQUIPMENT,
  normalizeEquipmentSelection,
} from "../domain/equipmentSelection";
import "../equipment-inventory.css";

export default function EquipmentInventory({
  options,
  items,
  onChange,
}: {
  options: readonly string[];
  items: readonly string[];
  onChange: (items: string[]) => void;
}) {
  const selected = normalizeEquipmentSelection(items);
  const equipmentFree = selected.includes(NO_EQUIPMENT);
  const explanationId = useId();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const choices = equipmentChoices([...options, ...items]);
  const shown = filterEquipment(choices, query);
  const selectable = shown.filter((item) => item !== NO_EQUIPMENT);
  return (
    <div className="equipment-inventory-container">
      <label className="equipment-search" htmlFor={searchId}>
        <span>Search equipment</span>
        <div className="equipment-search-control">
          <Search size={18} aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Equipment name"
            autoComplete="off"
          />
        </div>
      </label>
      <div className="equipment-selection-actions">
        <button
          type="button"
          className="btn secondary"
          disabled={!selectable.length}
          onClick={() =>
            onChange([
              ...new Set([
                ...selected.filter((item) => item !== NO_EQUIPMENT),
                ...selectable,
              ]),
            ])
          }
        >
          {query.trim() ? "Select all shown" : "Select all"}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={!selected.length}
          onClick={() => onChange([])}
        >
          Clear selection
        </button>
        <span className="fine-print" aria-live="polite">
          {equipmentFree ? "Bodyweight only" : `${selected.length} selected`}
        </span>
      </div>
      <div className="setup-inventory equipment-inventory">
        {shown.map((item) => {
          const disabled = equipmentFree && item !== NO_EQUIPMENT;
          return (
            <label
              className={`equipment-choice${item === NO_EQUIPMENT ? " equipment-choice-none" : ""}${disabled ? " equipment-choice-disabled" : ""}`}
              key={item}
            >
              <input
                type="checkbox"
                checked={selected.includes(item)}
                disabled={disabled}
                data-help={
                  item === NO_EQUIPMENT
                    ? "Choose bodyweight-only training for this environment. Selecting No equipment clears the other equipment choices and disables them until you uncheck it."
                    : `Adds ${item} to this environment's inventory. Uncheck No equipment first to make equipment choices available.`
                }
                aria-describedby={equipmentFree ? explanationId : undefined}
                onChange={(event) =>
                  onChange(
                    changeEquipmentSelection(items, item, event.target.checked),
                  )
                }
              />
              <span>{item.replace(/-/g, " ")}</span>
            </label>
          );
        })}
      </div>
      {query.trim() && !selectable.length && (
        <p className="fine-print equipment-inventory-note">
          No matching equipment. Try another name. You can add custom equipment
          in Settings.
        </p>
      )}
      {equipmentFree && (
        <p className="fine-print equipment-inventory-note" id={explanationId}>
          Bodyweight exercises only. Uncheck No equipment to select equipment.
        </p>
      )}
    </div>
  );
}
