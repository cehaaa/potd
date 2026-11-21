# Pokémon of the Day

An iPhone home screen widget, built with [Scriptable](https://scriptable.app), that shows a different Pokémon every day with its name, image and the date.

Tap the widget to open a full-screen view where you can swipe left and right through every Pokémon of the year.

## Run it on your iPhone

1. Install **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)** from the App Store. It's free.
2. Open Scriptable and tap **+** to create a new script.
3. Copy everything in [`potd.js`](potd.js) and paste it in.
4. Tap the script's title at the top and rename it to **potd**. Then tap **Done**.
5. Go to your home screen, long-press an empty spot and tap **Edit → Add Widget**.
6. Search for **Scriptable**, pick a size (small, medium or large) and tap **Add Widget**.
7. Long-press the new widget and tap **Edit Widget**. Set **Script** to **potd**.

That's it. The widget changes to a new Pokémon every day just after midnight.

### Optional: show a different day

In **Edit Widget**, set **Parameter** to a number of days away from today:

| Parameter | Shows |
|---|---|
| *(empty)* or `0` | Today |
| `-1` | Yesterday |
| `1` | Tomorrow |

### Optional: lock screen

Scriptable also works on the lock screen. Long-press the lock screen, tap **Customize → Lock Screen**, add a Scriptable widget and choose **potd**.

## Customize the Pokémon

The list of Pokémon lives in [`pokemon.json`](pokemon.json). The widget downloads it from GitHub, so you can change the lineup without touching the script.

### 1. Make your own copy

Fork this repo on GitHub. Your copy must stay **public**, because the widget can't sign in to read a private repo.

### 2. Edit `pokemon.json`

There is one entry per day, from 1st January to 31st December:

```json
{
  "name": "Pikachu",
  "date": "21st November",
  "image": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
}
```

- **name**: the text shown on the widget.
- **date**: the day it appears, written as `<day><st/nd/rd/th> <Month>`, for example `1st January` or `22nd March`.
- **image**: a link to any PNG or JPG. For official artwork, swap the number at the end of the link above for the Pokémon's National Pokédex number (Pikachu is `25`).

There's no entry for 29th February. In leap years the widget shows the 28th February Pokémon on that day.

### 3. Point the widget at your copy

Near the top of `potd.js`, change `DATA_URL` to the raw link of your `pokemon.json`:

```js
const DATA_URL =
  "https://raw.githubusercontent.com/<your-username>/potd/main/pokemon.json";
```

To find the link, open `pokemon.json` on GitHub and click **Raw**. Then paste the updated script into Scriptable again.

After that, push any change to `pokemon.json` and the widget picks it up the next time it refreshes. You don't need to edit the script again.

## Good to know

- The widget keeps a copy of the list and the images on your phone, so it still works offline.
- iOS decides exactly when widgets refresh. If a change doesn't show up right away, give it a few minutes.
- To preview the widget inside Scriptable, open this link on your phone: `scriptable:///run/potd?preview=1`
