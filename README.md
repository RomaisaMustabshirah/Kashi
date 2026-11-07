# KASHI ✦

**A generative Islamic geometry studio, inspired by the kashi tilework of Multan.**

▶ **Try it live:** https://romaisamustabshirah.github.io/Kashi/

![Kashi pattern](preview.png)

## About
Multan is known for *kashi*, its blue and white glazed tilework found on shrines
such as the tomb of Shah Rukn-e-Alam. Craftsmen built these star patterns with a
compass and a straightedge, following rules passed down through generations.

Kashi asks: **can those rules be written as code?** It generates Islamic star
patterns live in the browser, so anyone can explore how a single angle reshapes
an entire pattern.

## How It Works
Kashi uses the **polygons-in-contact** method, described by E. H. Hankin in the
1920s and later formalised by computer scientist Craig S. Kaplan:

1. **Tile the plane** with regular polygons, using one of six tilings.
2. **Cast rays:** from the midpoint of every edge, send two rays inward at the
   contact angle **θ**.
3. **Find intersections:** each ray stops where it meets a ray from the
   neighbouring edge. Those meeting points form the stars.
4. **Render as tilework:** lines are drawn as woven straps, and star rosettes are
   filled with colour.

## Features
- **6 tilings:** 4.4.4.4, 6.6.6, 3.3.3.3.3.3, 4.8.8, 3.6.3.6 and 3.4.6.4
- **Live controls:** contact angle θ, offset δ, tile size, rotation, strap width
- **6 palettes**, including *Multani Kashi*, inspired by Multan's blue tilework
- **Breathe mode:** θ animates gently, so the stars open and close
- **Randomize** for discovering new patterns
- **High-resolution PNG export** (3× screen size) for printing
- **Show tiling** to reveal the geometric skeleton under each pattern

## Controls
| Key | Action |
|---|---|
| `Space` | Breathe on/off |
| `R` | Randomize |
| `E` | Export PNG |
| `T` | Show/hide tiling |
| `F` | Fill rosettes on/off |
| `H` | Hide panel |
| `A` | About |

## Built With
- HTML, CSS, JavaScript
- HTML5 Canvas 2D (no libraries)
- GitHub Pages

## Project Structure
| File | Purpose |
|---|---|
| `index.html` | Page layout, control panel, About overlay |
| `style.css` | Panel and overlay styling |
| `kashi.js` | Tilings, Hankin's method, rendering, animation, export |

## References
- Hankin, E. H. (1925). *The Drawing of Geometric Patterns in Saracenic Art.*
- Kaplan, C. S. (2005). *Islamic star patterns from polygons in contact.*
  Proceedings of Graphics Interface 2005.

## Author
Designed and developed by **Romaisa Mustabshirah**.
