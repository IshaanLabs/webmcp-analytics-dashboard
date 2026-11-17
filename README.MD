# WebMCP Analytics Dashboard

**A React + TypeScript analytics dashboard that AI agents control through WebMCP, the browser-native way for web pages to expose tools to agents.**

Ask an agent such as Gemini (through Chrome's Model Context Tool Inspector extension) to *"compare Q1 and Q4 revenue across channels"* and watch the chart, filters and insights update live. The app itself is called **Insight**.

Keywords: WebMCP, `document.modelContext`, Model Context Protocol, AI agents, agent-ready website, React, Vite, Chrome.

## About the Project

Insight is a sales analytics dashboard with mock 2025 data (revenue, orders and users by channel, region and month). The page registers a set of **tools**, which are JavaScript functions with typed JSON schemas, on `document.modelContext`. A browser agent discovers those tools, calls them with structured arguments, and the dashboard updates immediately.

There is no backend and no DOM scraping. The tools run inside the user's own tab.

```
User prompt ─► Agent host (Inspector extension) ─► LLM (Gemini)
                      │  1. discovers tools on the page
                      │  2. LLM picks a tool and arguments
                      ▼
          document.modelContext → tool.execute(args)
                      │  3. runs in the user's tab, updates the store
                      ▼
          Chart re-renders → result returns to the LLM → LLM answers
```

The LLM never runs your code. It only asks for a tool call, and the page runs it.

Highlights:

- 7 always-on tools and 3 **dynamic tools** that exist only while they make sense for the page's state.
- Grouped two-quarter comparison charts, pinned insights and a green "agent pulse" on whatever an agent changes.
- A "Try asking the agent" panel with ready-made prompts that tick off as the matching tools run.
- A human confirmation step before anything is downloaded.

## Tech Stack

| Area                 | Choice                                                      |
| -------------------- | ----------------------------------------------------------- |
| UI                   | React 19, TypeScript                                        |
| Build tool           | Vite                                                        |
| Charts               | Chart.js with react-chartjs-2                               |
| State                | A small external store read with `useSyncExternalStore`   |
| Agent interface      | WebMCP (`document.modelContext`), JSON Schema tool inputs |
| Linting              | oxlint                                                      |
| Agent host for demos | Model Context Tool Inspector Chrome extension with Gemini   |

## Project Structure

```
.
├── index.html                 # Page title and SEO meta tags
├── package.json
├── public/
│   └── favicon.svg
└── src/
    ├── App.tsx                # Layout, WebMCP registration on mount, status badge
    ├── index.css              # Styles, light and dark theme
    ├── main.tsx
    ├── data/
    │   ├── mockData.ts        # Seeded 2025 data: 12 months × 5 channels × 4 regions
    │   └── queries.ts         # Pure query functions (query, compare, totals)
    ├── store/
    │   └── dashboardStore.ts  # One store shared by the UI and the tools
    ├── webmcp/
    │   ├── schemas.ts         # JSON Schemas with enums for tool inputs
    │   └── registerTools.ts   # Tool definitions and dynamic registration
    └── components/
        ├── ChartPanel.tsx     # Bar, line and pie charts, two-quarter comparison
        ├── DemoGuide.tsx      # "Try asking the agent" prompt panel
        ├── Filters.tsx
        ├── Insights.tsx       # Findings pinned by the agent
        ├── KpiCards.tsx       # Totals with change versus the previous quarter
        ├── Pulse.tsx          # Highlight shown when an agent changes the page
        └── ToolLog.tsx        # Activity log of agent and user actions
```

## Installation

Requirements: Node.js 20 or newer, and desktop Chrome 146 or newer (built and tested on Chrome 157).

```bash
git clone https://github.com/IshaanLabs/webmcp-analytics-dashboard.git
cd webmcp-analytics-dashboard
npm install
npm run dev
```

The app runs at http://localhost:5173. Other scripts:

```bash
npm run build     # type-check and production build
npm run lint      # oxlint
npm run preview   # serve the production build
```

## Configuration

The app has no environment variables and no secrets. The setup is in the browser:

1. **Enable WebMCP in Chrome.** Open `chrome://flags/#enable-webmcp-testing`, set **WebMCP for testing** to **Enabled**, and relaunch Chrome.
2. **Install the Inspector extension.** Get **WebMCP - Model Context Tool Inspector** from the Chrome Web Store (id `gbpdfapgefenggkahomfgkhfehlcenpd`). It has no production security boundaries, so use a separate Chrome profile for demos and testing.
3. **Add a Gemini API key.** Create one at https://aistudio.google.com/apikey and enter it with the extension's "Set/Update Gemini API key" button. Never commit the key.
4. **Check the connection.** Open the dashboard. The header badge should read **7 tools exposed to agents**.

The page must be served from `localhost` or HTTPS, because WebMCP needs a secure context.

## Usage

Open the Inspector's side panel on the dashboard tab, paste a prompt into its chat, and watch the dashboard respond. The **Try asking the agent** panel on the page has prompts you can click to copy, and each one ticks when the matching tool runs:

1. `Compare Q1 and Q4 revenue across channels` draws a grouped bar chart.
2. `Which channel grew fastest between Q1 and Q4? Pin the finding.` answers and pins a note in Insights.
3. `Drill into the top channel` shows that channel's monthly trend.
4. `Show orders by region as a pie chart` changes metric, grouping and chart type in one call.
5. `Export what I am looking at` asks for confirmation before downloading a CSV.
6. `Reset the dashboard` returns to the default view.

### Run tools manually (no LLM needed)

You can call any tool directly from the Inspector without using an AI model: open the extension's side panel on the dashboard tab, pick a tool from the list, paste the JSON below into its input box and click **Execute Tool**. This is a good way to check your setup before trying the agent.

| Tool                       | Input JSON                                                                    | What you should see                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_metrics`           | `{}`                                                                        | The valid metrics, channels, regions and quarters. The screen doesn't change.                                                                               |
| `query_metrics`          | `{"metric":"revenue","groupBy":"channel","quarter":"Q1"}`                   | Revenue per channel for Q1 in the result. The screen doesn't change, but the Activity log gets an entry.                                                    |
| `compare_periods`        | `{"metric":"revenue","groupBy":"channel","periodA":"Q1","periodB":"Q4"}`    | One line per channel, such as `Social: Q1 $187,626 -> Q4 $254,056 (+35.4%)`.                                                                              |
| `render_chart`           | `{"metric":"revenue","groupBy":"channel","chartType":"bar","quarter":"Q1"}` | A bar chart of Q1 revenue by channel, and a green pulse on the chart.                                                                                       |
| `render_chart` (compare) | `{"metric":"revenue","groupBy":"channel","quarter":"Q1","compareTo":"Q4"}`  | A grouped bar chart with Q1 and Q4 side by side and a "Q1 vs Q4" label.                                                                                     |
| `render_chart` (pie)     | `{"metric":"orders","groupBy":"region","chartType":"pie"}`                  | A pie chart of orders by region.                                                                                                                            |
| `set_filters`            | `{"quarter":"Q4","channel":"Social"}`                                       | The Period and Channel dropdowns change, and the KPI cards update.                                                                                          |
| `add_insight`            | `{"text":"Social grew fastest: +35.4% revenue from Q1 to Q4."}`             | A note appears in the Insights panel, and `clear_insights` shows up in the tool list.                                                                     |
| `drill_down`             | `{"key":"Social"}`                                                          | A monthly line chart for Social. Only listed while the chart is grouped by channel or region, so run a `render_chart` with `"groupBy":"channel"` first. |
| `export_report`          | `{}`                                                                        | A confirmation dialog, then a CSV download if you click OK.                                                                                                 |
| `reset_dashboard`        | `{}`                                                                        | The default view. Only listed while the view differs from the default.                                                                                      |

A good first sequence to try by hand:

1. `render_chart` with `{"metric":"revenue","groupBy":"channel","quarter":"Q1","compareTo":"Q4"}`. The chart appears, and `drill_down` and `reset_dashboard` show up in the tool list.
2. `drill_down` with `{"key":"Social"}`. The chart switches to Social's monthly trend, and `drill_down` disappears from the list.
3. `reset_dashboard` with `{}`. The dashboard returns to its default view.

Invalid input is rejected with a message that lists the allowed values. For example, `set_filters` with `{"channel":"Nope"}` returns `Invalid channel "Nope". Allowed: All, Organic, Paid Search, Email, Social, Referral.`, and the Activity log shows the failure in red.

### Tools

| Tool                | Kind    | What it does                                                                       |
| ------------------- | ------- | ---------------------------------------------------------------------------------- |
| `list_metrics`    | read    | Lists valid metrics, channels, regions and quarters                                |
| `query_metrics`   | read    | Totals of a metric grouped by channel, region or month, with no screen change      |
| `compare_periods` | read    | Compares two quarters with change and percent change                               |
| `render_chart`    | write   | Draws a chart.`quarter` plus `compareTo` draws a grouped two-quarter bar chart |
| `set_filters`     | write   | Changes the quarter, channel and region filters                                    |
| `add_insight`     | write   | Pins a short finding to the Insights panel                                         |
| `export_report`   | write   | Downloads a CSV after the user confirms                                            |
| `drill_down`      | dynamic | Exists only while the chart is grouped by channel or region                        |
| `reset_dashboard` | dynamic | Exists only while the view differs from the default                                |
| `clear_insights`  | dynamic | Exists only while at least one insight is pinned                                   |

Read tools never change the screen on purpose. Write tools do. Dynamic tools are registered and removed with an `AbortSignal` as the dashboard state changes, so the agent only sees tools that make sense right now.

## Notes

- **WebMCP is experimental.** It is an origin trial from Chrome 149, and names and signatures may change. This project uses `document.modelContext`, with a fallback to `navigator.modelContext`.
- **The data is mock data.** It is generated from a fixed seed, so every load is identical.
- **Badge says "WebMCP unavailable".** The flag is off, Chrome is older than 146, or the page is not on `localhost` or HTTPS. In the console, `typeof document.modelContext` should be `"object"`.
- **The Inspector chat does nothing.** Switch the model with the Inspector's radio buttons, since the default can be slow or unavailable for your key. To check the key, request `https://generativelanguage.googleapis.com/v1beta/models` with an `x-goog-api-key` header. It should return 200.
- **Prompts feel slow.** Use a fast Gemini Flash model, and run the first prompt once before presenting.
- **A tool did not remove itself.** This build removes tools with an `AbortSignal`. If a Chrome update changes the API, check the current WebMCP spec.

## Contributing

Contributions to this project are welcome! If you have ideas for improvements, bug fixes, or new features, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [MIT License](LICENSE) file for details.
