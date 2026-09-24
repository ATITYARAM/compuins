# Content Management Guide (Non-Technical Editors)

You do **NOT** need to know HTML or CSS to update the text, phone numbers, addresses, services, or projects on this website.

All website content is organized in simple, easy-to-edit JSON files inside the `src/data/` folder.

---

## 📁 Content Files Map

| File | What you can update inside it |
| :--- | :--- |
| **`company.json`** | Company name, phone numbers, WhatsApp, email, office addresses, legal numbers (GST, PAN, VAT). |
| **`hero.json`** | Homepage main headline, subtitle, action button labels, and top statistics ("30+ years", etc.). |
| **`services.json`** | List of services: icons, titles, and descriptions. |
| **`legacy.json`** | Historical timeline cards (founding date, internet milestone, SSA training, etc.). |
| **`projects.json`** | Government & enterprise project rows: client name, duration/year, project title, and description. |
| **`endorsements.json`**| Official appreciation letters & quotes, official's name, designation, and date. |
| **`infrastructure.json`**| Facility equipment numbers (workstations, printers, area) and team roles/headcounts. |
| **`navigation.json`** | Top navigation menu links. |

---

## ✏️ How to Edit

1. **Open the relevant file** (for example, `src/data/company.json`).
2. **Change the text inside the quotation marks `"..."`**.
   - Example:
     ```json
     "phoneDisplay": "94431 70969"
     ```
     Change to:
     ```json
     "phoneDisplay": "98422 98965"
     ```
3. **Save the file** (`Ctrl + S`).
4. The website will automatically reload and display the updated content!

### ⚠️ A Few Simple Rules:
- Keep the quotation marks `""` around your text.
- Do not remove the commas `,` at the end of lines.
- To add a new service or project, copy an existing block `{ ... }`, add a comma after the previous block, and paste it.
