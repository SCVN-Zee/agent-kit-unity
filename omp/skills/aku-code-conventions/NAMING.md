# Naming Conventions

## 1. Notations — what casing for what target

### 1.1 PascalCase

First letter of each word capitalized. Targets:

- namespace
- class
- interface
- property
- function (method)
- enum (type name and values)

```csharp
namespace SnakeClash.Lobby

public class PlayerSample
public interface IOnboard
public bool IsLive { get; private set; } = true;
public void Initialize() { }
public enum EAdsStyle { Interstitial, RewardedVideo, Banner }
```

### 1.2 camelCase

First letter lowercase, subsequent words capitalized. Targets:

- member variables (with `_` prefix — see §2.4)
- local variables
- function parameters

```csharp
private PlayerSample _player = null;

public void DoSomething(int totalCount)
{
    int calcedCount = 0;
}
```

### 1.3 UPPER_SNAKE_CASE

All caps, words separated by underscore. Targets:

- const member variables
- const local variables (rare; usually pull to class level)

```csharp
private const string LOCAL_FILE_PATH = "...";
private const int LIMIT_TRY_COUNT = 10;
```

## 2. Target-specific rules

### 2.1 Namespace

Game name first; subsequent segments follow folder/system structure.

```csharp
namespace SnakeClash.Lobby
namespace AgeOfDinosaurs.Talent.UI
namespace ArrowFlow.Playable010
```

For kit-shipped templates, use the placeholder `<GameName>.<Variant>` and substitute at generation time.

### 2.2 Class

- Name as a **noun**.
- Name reflects purpose.

```csharp
public class PurchaseManager
public class PlayerController
public class Character
```

### 2.3 Interface

- Name as a **noun** (or noun phrase).
- Prefix with `I`.
- Descriptive — names what the interface enables.

```csharp
public interface IVehicle
public interface ICollectibleItem
```

### 2.4 Member variable

- Name as a **noun**.
- Prefix with `_`.
- `private` access modifier (always required; use `[SerializeField] private` for Inspector-exposed).

```csharp
private int _totalCount = 0;
private bool _validTotalCount = false;
[SerializeField] private float _moveSpeed = 5f;
```

### 2.5 Property

- Name as a noun or stative verb (e.g. `IsAlive`, `HasInput`).
- Reflects role.
- If setter is public, always assign value to the backing member variable inside the setter.
- **Never return null for value types** (int, float, decimal, bool, enum, struct).
- Prefer a function when property logic becomes complex.

```csharp
public bool IsInitialized { get; private set; } = false;

public int TotalCount
{
    get { return _totalCount; }
    set
    {
        _totalCount = value;
        _validTotalCount = 0 < value;
    }
}
```

### 2.6 Function

- Name as a **verb** (or verb phrase).
- Describes what it does.

```csharp
public bool TryInit(InitContext context)
public Player GetCurrentPlayer()
public void SetEnabledVehicle(IVehicle vehicle)
```

### 2.7 Enumeration types

- Name as a **noun**.
- Suffix with `Type` / `Style` / similar when the role isn't self-evident.
- Prefix with `E`.

```csharp
public enum EPlatform { iOS, Android, Windows, MacOS }
public enum EItemStyle { Equipable, Usable }
public enum EState { Idle, Running, Dead }
```

## 3. Exceptions

### 3.1 No abbreviations — use full words

Always write full, meaningful names. Don't abbreviate.

Accepted well-known abbreviations: `ID`, `UI`, `FX`, `HP`, `URL`, `HTTP`. Use all caps OR all lowercase — never mixed (`Id` is wrong; `ID` or `id` is right).

```csharp
// Bad: _d, _cnt, _btn, Calc(), UpdatePos()
// Good: _distance, _count, _buttonName, Calculate(), UpdatePosition()
// Accepted: private int _id; public int ID { get; private set; }
```

Loop indices `i, j, k, x, y` tolerated; prefer meaningful names (`enemyIndex`, `tileX`).

### 3.2 Using numbers

Allowed in names; cannot start with a number. `Custom2Dimension` valid; `2DCustom` is a compile error.

### 3.3 Anonymous function parameters

- Don't use single `_` as a parameter name.
- Use `_` suffix for shadowed variable names.

```csharp
PaymentManager.Instance.TryBuy(id, (id_, result) =>
{
    if (id != id_) { return; }
    doneCallback?.Invoke(result);
});
```

## Cross-references

- [`STRUCTURE.md`](STRUCTURE.md) — class structure + lifecycle pairing
- `skill://aku-asset-conventions/ASSET_PREFIXES.md` — asset file naming (different rules; assets use prefixes like `M_`, `T_`)
