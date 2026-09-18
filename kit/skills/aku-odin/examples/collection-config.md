# Example — searchable wave rows with explicit storage

Illustrative Odin-enabled asset; compile/verify in the consumer before adopting it. Unity stores the serializable
row list. TableList/Searchable alter presentation, not storage. Save this asset using project config-prefix policy.

```csharp
using System;
using System.Collections.Generic;
using Sirenix.OdinInspector;
using UnityEngine;

namespace GameName.Gameplay
{
    [CreateAssetMenu(menuName = "Game/Wave Settings", fileName = "WAV_Default")]
    public sealed class WaveConfig : ScriptableObject
    {
        //----------------------------------------------------------------------
        // Serialized Fields
        //----------------------------------------------------------------------
        [field: TableList(ShowIndexLabels = true, ShowPaging = true)]
        [field: Searchable]
        [field: ValidateInput(nameof(HasValidRows), "Add a wave; each row needs a prefab, positive count and finite nonnegative delay.")]
        [field: SerializeField] public List<WaveRow> Waves { get; private set; } = new List<WaveRow>();

        //----------------------------------------------------------------------
        // Logic
        //----------------------------------------------------------------------
        private bool HasValidRows(List<WaveRow> values)
        {
            if (values == null || values.Count == 0)
            {
                return false;
            }
            foreach (WaveRow row in values)
            {
                if (row == null || !row.IsValid)
                {
                    return false;
                }
            }
            return true;
        }
    }

    [Serializable]
    public sealed class WaveRow
    {
        //----------------------------------------------------------------------
        // Serialized Fields
        //----------------------------------------------------------------------
        [Required]
        [SerializeField, AssetsOnly] private GameObject _prefab;
        [TableColumnWidth(70, Resizable = false)]
        [SerializeField, MinValue(1)] private int _count = 1;
        [TableColumnWidth(90)]
        [SerializeField, MinValue(0f), SuffixLabel("s", Overlay = true)]
        private float _delay;

        //----------------------------------------------------------------------
        // Properties
        //----------------------------------------------------------------------
        public bool IsValid => _prefab != null && _count > 0 &&
            _delay >= 0f && !float.IsNaN(_delay) && !float.IsInfinity(_delay);
    }
}
```

Validation checks stored values independently of the drawer's numeric clamping. No persistent identity is derived
from row index. If another asset refers to individual waves, add stable IDs and duplicate validation before reordering.
The private setter restricts reassignment, not mutation of List contents; runtime consumers must respect config ownership.
Verify field-targeted decoration and save/reopen just as in the ScriptableObject convention recipe.

Searchable/table composition is version-sensitive. Test empty/null rows, page boundaries, 1,000-row responsiveness,
Undo/redo and save/reopen. For narrow inspectors, prefer a normal list or selected-row detail pane over unreadable columns.

See [`COLLECTIONS_AND_REFERENCES.md`](../COLLECTIONS_AND_REFERENCES.md) and
[`PICKERS_AND_VALIDATION.md`](../PICKERS_AND_VALIDATION.md).
