import { useId } from "react";
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
  return (
    <div className="equipment-inventory-container">
      <div className="setup-inventory equipment-inventory">
        {equipmentChoices([...options, ...items]).map((item) => {
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
      {equipmentFree && (
        <p className="fine-print equipment-inventory-note" id={explanationId}>
          Bodyweight exercises only. Uncheck No equipment to select equipment.
        </p>
      )}
    </div>
  );
}
