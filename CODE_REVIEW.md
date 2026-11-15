# Dinosauria-Network/site — Code Review

**Project:** Dinosauria-Network/site  
**Root:** `/Users/alex/Sites/Dinosauria-Network/site`  
**Scope:** Whole-project (Bedrock/Roots config + `fossils-master` theme + `genus-post-type` plugin + dependencies)

---

## 🔴 Critical / Break-the-site

### 1. Theme `lib/extras.php` — fatal at include time
**File:** `web/app/themes/fossils-master/lib/extras.php` (line 54)
```php
$the_url = esc_url( get_link_url() );  // executed globally
```
- Called **before** `get_link_url()` is defined (line 56).
- Runs in namespace `Roots\Fossils\Extras`, so it looks for `Roots\Fossils\Extras\get_link_url()`, which doesn't exist yet.
- **Result:** `Uncaught Error: Call to undefined function ...` on every page load.
- **Fix:** Remove the global call; use it inside `get_link_url()` or inside a filter/action only when needed.

### 2. Theme `lib/assets.php` — missing asset + missing manifest
**File:** `web/app/themes/fossils-master/lib/assets.php` (lines 68-79)
```php
wp_enqueue_script('masonry', asset_path('scripts/masonry.js'), ['jquery'], null, true);
```
- `dist/scripts/masonry.js` **does not exist**.
- `dist/assets.json` is missing; `asset_path()` falls back to raw filenames, but file is absent.
- **Fix:** Remove `masonry` enqueue or add the built file; regenerate `assets.json` via build pipeline.

---

## 🟠 High / Security & Data Integrity

### 3. Custom plugin meta box — missing authorization + weak sanitization
**File:** `web/app/plugins/genus-post-type/genus-post-type.php` (lines 162-187)

- `save_post()` never checks `current_user_can('edit_post', $post_id)`.
- Only `_author`/`_date` get `sanitize_text_field`/`sanitize_email`; number fields (`_paleodb`, `_gbif`, etc.) are saved raw from `$_POST`.
- HTML `sprintf` output (line 145-152) embeds `$db_value` without `esc_attr()` → broken HTML / potential XSS if value contains quotes.
- Screen name `'Genus'` (line 61) should be `'genus'` (post type slug) to guarantee meta box shows.
- **Fix:** Add `current_user_can()` guard; sanitize numbers via `absint()`/`intval()`; use `esc_attr()` in field output; correct screen key.

### 4. Theme `lib/assets.php` — unsanitized SQL query
**File:** `web/app/themes/fossils-master/lib/assets.php` (lines 88-93)
```php
$attachment = $wpdb->get_col($wpdb->prepare("SELECT ID FROM " . $prefix . "posts" . " WHERE guid='%s';", $url ));
```
- Uses `$wpdb->prepare()` correctly, but concatenates table name manually; better to use `$wpdb->posts`.
- `guid` can contain URLs with query strings; match might fail unexpectedly.
- **Fix:** Use `$wpdb->posts`, consider `LIKE` if needed, or better: `attachment_url_to_postid()` (WP native).

---

## 🟡 Medium / Config & Maintenance

### 5. Bedrock config — boolean parsing risk
**File:** `config/environments/development.php` (line 12)
```php
Config::define('WP_DEBUG_LOG', env('WP_DEBUG_LOG') ?? true);
```
- `.env` values are strings; `"false"` is truthy.
- **Fix:** Parse explicitly: `filter_var(env('WP_DEBUG_LOG'), FILTER_VALIDATE_BOOLEAN) ?? true`.

### 6. Theme `lib/init.php` — image size filter has wrong key name
**File:** `web/app/themes/fossils-master/lib/init.php` (lines 51-57)
```php
function my_custom_sizes( $sizes ) {
    return array_merge( $sizes, array(
        'small' => __( 'Small', 'fossils' ),
    ) );
}
```
- Filter is `image_size_names_choose`; adding `'small'` may conflict with WP's built-in `small` (150x150). Intent seems to add a label for existing size; okay, but consider unique name.

### 7. Theme `style.css` — missing `Text Domain`
**File:** `web/app/themes/fossils-master/style.css`
- No `Text Domain: fossils` header; translations in theme may not load correctly with `load_theme_textdomain`.

### 8. Plugin taxonomy — translation domain mismatch
**File:** `web/app/plugins/genus-post-type/inc/chronostratigraphy_taxonomy.php` (lines 7-27)
- Uses `'genus'` domain instead of `'fossils'`; strings won't match theme/plugin translations.

---

## 🟢 Low / Polish

### 9. Theme `lib/assets.php` — external font enqueue without version/dependency
- `googleFonts` enqueued with `false, null`; fine, but could break if blocked.

### 10. Theme `function.php` includes — `trigger_error` severity
- If any included lib file is deleted, theme fatals with `E_USER_ERROR`. Acceptable, but consider graceful fallback for production.

### 11. `dist/` build artifacts missing
- `main.js`, `main.css`, `editor-style.css` present, but no `assets.json` and no `masonry.js`. Verify build pipeline (`gulp`/`webpack`/etc.) runs correctly.

### 12. `composer.json` — PHP 8.1 minimum, dependencies okay
- `roots/bedrock` structure is sound; `dinosauria-network/genus-post-type` pulls from git correctly.
- `phpcs` configured but `test` script just runs `phpcs`; no custom ruleset shown.

---

## Recommendation summary

| Priority | Action |
|---|---|
| **P0** | Fix `extras.php` global call (remove or wrap) |
| **P0** | Fix/remove `masonry.js` enqueue; build/regenerate `assets.json` |
| **P1** | Harden `genus-post-type` meta box (`current_user_can`, `esc_attr`, sanitization, screen key) |
| **P1** | Improve `assets.php` SQL / use native WP helper |
| **P2** | Fix `development.php` boolean parsing; add `Text Domain` header |
| **P2** | Verify build pipeline produces all `dist/` assets |

---

*Saved from analysis at `/Users/alex/Sites/Dinosauria-Network/site`.*
