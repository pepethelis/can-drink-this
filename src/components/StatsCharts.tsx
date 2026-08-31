import { useEffect, useMemo, useRef, useState } from "react";
import { AUTHORS } from "@/constants";
import getReviewStats, {
  type ReviewItem,
  type ReviewStatsData,
} from "@/utils/getReviewStats";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type KV = [string, number];

interface Props {
  allStats: ReviewStatsData;
  ownStats: ReviewStatsData;
  friendlyStats?: ReviewStatsData;
  subscriberStats?: ReviewStatsData;
  rawReviews?: ReviewItem[];
  rawCreationReviews?: ReviewItem[];
  reviewsUrl: string;
}

type CategoryKey = "all" | "own" | "friendly" | "subscribers";

interface CategoryOption {
  key: CategoryKey;
  label: string;
  categoryName?: string;
}

const CATEGORIES: CategoryOption[] = [
  { key: "all", label: "All reviews" },
  { key: "own", label: "Own reviews", categoryName: "власні огляди" },
  { key: "friendly", label: "Friendly", categoryName: "дружні огляди" },
  { key: "subscribers", label: "Subscribers", categoryName: "огляди від підписників" },
];

const PALETTE = [
  "#60a5fa",
  "#fb923c",
  "#34d399",
  "#f87171",
  "#a78bfa",
  "#fbbf24",
  "#22d3ee",
  "#e879f9",
  "#4ade80",
  "#f472b6",
  "#94a3b8",
  "#fcd34d",
  "#6ee7b7",
  "#c4b5fd",
  "#fca5a5",
];

function getCssVar(name: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function useTheme() {
  const [colors, setColors] = useState({
    accent: "#60a5fa",
    foreground: "#282728",
    muted: "#e6e6e6",
    background: "#fdfdfd",
  });

  useEffect(() => {
    function read() {
      setColors({
        accent: getCssVar("--accent"),
        foreground: getCssVar("--foreground"),
        muted: getCssVar("--muted"),
        background: getCssVar("--background"),
      });
    }
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return colors;
}

type Colors = ReturnType<typeof useTheme>;

function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function tooltipStyle(colors: Colors) {
  return {
    background: colors.background,
    border: `1px solid ${hexA(colors.foreground, 0.15)}`,
    borderRadius: 6,
    fontSize: 12,
    color: colors.foreground,
  };
}

function tooltipItemStyle(colors: Colors) {
  return { color: colors.foreground };
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`chart-card ${className ?? ""}`}>
      <h2 className="chart-title">{title}</h2>
      {children}
    </div>
  );
}

function DonutChart({ data, colors }: { data: KV[]; colors: Colors }) {
  const total = data.reduce((s, [, v]) => s + v, 0);
  const items = data.map(([name, value], i) => ({
    name,
    value,
    fill: PALETTE[i % PALETTE.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={items}
          cx="50%"
          cy="50%"
          innerRadius="52%"
          outerRadius="78%"
          dataKey="value"
          strokeWidth={2}
          stroke={colors.background}
        />
        <Tooltip
          contentStyle={tooltipStyle(colors)}
          // @ts-expect-error recharts 3.x intersection type is overly strict
          formatter={(value: number) =>
            `${value} (${Math.round((value / total) * 100)}%)`
          }
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function HBarChart({
  data,
  mono,
  colors,
  height,
}: {
  data: KV[];
  mono?: boolean;
  colors: Colors;
  height: number;
}) {
  const maxLabelLen = Math.max(...data.map(([name]) => name.length));
  const yAxisWidth = Math.min(Math.max(maxLabelLen * 7, 64), 180);

  const items = data.map(([name, value], i) => ({
    name,
    value,
    fill: mono
      ? hexA(colors.accent, 1 - i * (0.5 / data.length))
      : PALETTE[i % PALETTE.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={items}
        margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
      >
        <CartesianGrid
          horizontal={false}
          stroke={hexA(colors.foreground, 0.08)}
        />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: hexA(colors.foreground, 0.5) }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={yAxisWidth}
          tick={{ fontSize: 11, fill: hexA(colors.foreground, 0.7) }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: hexA(colors.foreground, 0.05) }}
          contentStyle={tooltipStyle(colors)}
          itemStyle={tooltipItemStyle(colors)}
          // @ts-expect-error recharts 3.x intersection type is overly strict
          formatter={(v: number) => String(v)}
        />
        <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TimeChart({ data, colors }: { data: KV[]; colors: Colors }) {
  const items = data.map(([key, value]) => {
    const [y, m] = key.split("-");
    const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(
      "en",
      {
        month: "short",
        year: "2-digit",
      }
    );
    return { label, value };
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={items} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke={hexA(colors.foreground, 0.08)}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: hexA(colors.foreground, 0.5) }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: hexA(colors.foreground, 0.5) }}
          axisLine={false}
          tickLine={false}
          width={24}
        />
        <Tooltip
          cursor={{ fill: hexA(colors.foreground, 0.05) }}
          contentStyle={tooltipStyle(colors)}
          // @ts-expect-error recharts 3.x intersection type is overly strict
          formatter={(v: number) => [v, "reviews"]}
        />
        <Bar
          dataKey="value"
          fill={hexA(colors.accent, 0.75)}
          radius={[3, 3, 0, 0]}
          barSize={14}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PostingGapChart({ data, colors }: { data: KV[]; colors: Colors }) {
  const items = data.map(([key, value]) => {
    const [y, m] = key.split("-");
    const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(
      "en",
      {
        month: "short",
        year: "2-digit",
      }
    );
    return { label, value: Number(value.toFixed(1)) };
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={items} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke={hexA(colors.foreground, 0.08)}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: hexA(colors.foreground, 0.5) }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals
          tick={{ fontSize: 11, fill: hexA(colors.foreground, 0.5) }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          cursor={{ stroke: hexA(colors.foreground, 0.15) }}
          contentStyle={tooltipStyle(colors)}
          // @ts-expect-error recharts 3.x intersection type is overly strict
          formatter={(v: number) => [`${v} days`, "average gap"]}
        />
        <Line
          type="monotone"
          dataKey="value"
          name="Average gap"
          stroke={colors.accent}
          strokeWidth={2}
          dot={{ r: 3, fill: colors.accent }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ActivityGraph({ data, colors }: { data: KV[]; colors: Colors }) {
  const [hovered, setHovered] = useState<{
    date: string;
    count: number;
  } | null>(null);

  const dayCount = new Map(data);

  const CELL = 11;
  const GAP = 2;
  const STEP = CELL + GAP;
  const WEEKS = 53;
  const DAY_LABELS_W = 26;
  const MONTH_H = 18;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  // advance to end of current Mon–Sun week (Sunday)
  endDate.setDate(endDate.getDate() + ((7 - endDate.getDay()) % 7));

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - WEEKS * 7 + 1); // lands on Monday

  type Cell = {
    date: string;
    count: number;
    week: number;
    day: number;
    future: boolean;
  };
  const cells: Cell[] = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const daysFromStart = Math.round(
      (cur.getTime() - startDate.getTime()) / 86400000
    );
    const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    cells.push({
      date: dateStr,
      count: dayCount.get(dateStr) ?? 0,
      week: Math.floor(daysFromStart / 7),
      day: (cur.getDay() + 6) % 7, // 0=Mon … 6=Sun
      future: cur > today,
    });
    cur.setDate(cur.getDate() + 1);
  }

  const monthLabels: { label: string; week: number }[] = [];
  let lastMonth = -1;
  for (const cell of cells) {
    if (cell.day === 0) {
      // Monday = first row of a new week column
      const d = new Date(cell.date + "T12:00:00");
      const m = d.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({
          label: d.toLocaleDateString("en", { month: "short" }),
          week: cell.week,
        });
        lastMonth = m;
      }
    }
  }

  function cellFill(count: number, future: boolean): string {
    if (future || count === 0) return hexA(colors.foreground, 0.07);
    if (count === 1) return hexA(colors.accent, 0.35);
    if (count === 2) return hexA(colors.accent, 0.6);
    return hexA(colors.accent, 0.9);
  }

  const svgW = DAY_LABELS_W + WEEKS * STEP;
  const svgH = MONTH_H + 7 * STEP;

  const hoveredLabel = hovered
    ? `${hovered.count || "No"} review${hovered.count !== 1 ? "s" : ""} — ${new Date(hovered.date + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`
    : "";

  return (
    <div>
      <div style={{ overflowX: "auto", paddingBottom: 12 }}>
        <svg width={svgW} height={svgH} style={{ display: "block" }}>
          {monthLabels.map(({ label, week }) => (
            <text
              key={`${label}-${week}`}
              x={DAY_LABELS_W + week * STEP}
              y={MONTH_H - 5}
              fontSize={9}
              fill={hexA(colors.foreground, 0.45)}
            >
              {label}
            </text>
          ))}
          {(["Mon", "", "Wed", "", "Fri", "", "Sun"] as const).map(
            (label, i) =>
              label ? (
                <text
                  key={i}
                  x={0}
                  y={MONTH_H + i * STEP + CELL - 1}
                  fontSize={9}
                  fill={hexA(colors.foreground, 0.4)}
                >
                  {label}
                </text>
              ) : null
          )}
          {cells.map(({ date, count, week, day, future }) => (
            <rect
              key={date}
              x={DAY_LABELS_W + week * STEP}
              y={MONTH_H + day * STEP}
              width={CELL}
              height={CELL}
              rx={2}
              fill={cellFill(count, future)}
              onMouseEnter={() => setHovered({ date, count })}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
          minHeight: 16,
        }}
      >
        <span style={{ fontSize: 11, color: hexA(colors.foreground, 0.55) }}>
          {hoveredLabel}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 9, color: hexA(colors.foreground, 0.4) }}>
            Less
          </span>
          {([0, 1, 2, 3] as const).map(n => (
            <svg
              key={n}
              width={CELL}
              height={CELL}
              style={{ display: "block" }}
            >
              <rect
                width={CELL}
                height={CELL}
                rx={2}
                fill={cellFill(n, false)}
              />
            </svg>
          ))}
          <span style={{ fontSize: 9, color: hexA(colors.foreground, 0.4) }}>
            More
          </span>
        </div>
      </div>
    </div>
  );
}

export default function StatsCharts({
  allStats,
  ownStats,
  friendlyStats,
  subscriberStats,
  rawReviews = [],
  rawCreationReviews = [],
  reviewsUrl,
}: Props) {
  const colors = useTheme();
  // category: "all" | "own" | "friendly" | "subscribers"
  const [category, setCategory] = useState<CategoryKey>("all");
  // null means "all authors in this category"
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  // "own" always means AUTHORS[0] – no sub-author choice
  const ownAuthorName = AUTHORS[0]?.name ?? "";

  // Authors available for sub-selection in friendly / subscribers categories
  const subAuthors = useMemo(() => {
    if (category !== "friendly" && category !== "subscribers") return [];
    const catName = CATEGORIES.find(c => c.key === category)?.categoryName;
    if (!catName) return [];
    const counts = new Map<string, number>();
    for (const r of rawReviews) {
      if (r.data.category !== catName) continue;
      counts.set(r.data.author, (counts.get(r.data.author) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rawReviews, category]);

  const handleCategoryChange = (next: CategoryKey) => {
    setCategory(next);
    setSelectedAuthor(null);
    setIsDropdownOpen(false);
  };

  // Pre-computed category stats (no client recalculation needed for category-level view)
  const categoryStats = useMemo<ReviewStatsData>(() => {
    switch (category) {
      case "own": return ownStats;
      case "friendly": return friendlyStats ?? allStats;
      case "subscribers": return subscriberStats ?? allStats;
      default: return allStats;
    }
  }, [category, allStats, ownStats, friendlyStats, subscriberStats]);

  // For "own", author is always AUTHORS[0]; no client re-computation
  // For friendly/subscribers with a selected sub-author, recompute client-side
  const stats = useMemo<ReviewStatsData>(() => {
    if (category === "own") {
      // own reviews are already scoped to AUTHORS[0], return as-is
      return ownStats;
    }
    if (selectedAuthor === null || rawReviews.length === 0) {
      return categoryStats;
    }
    // Filter by category + selected author
    const catName = CATEGORIES.find(c => c.key === category)?.categoryName;
    const filtered = rawReviews.filter(r => {
      if (catName && r.data.category !== catName) return false;
      if (r.data.author !== selectedAuthor) return false;
      return true;
    });
    const filteredCreation = rawCreationReviews.filter(r => {
      if (catName && r.data.category !== catName) return false;
      if (r.data.author !== selectedAuthor) return false;
      return true;
    });
    return getReviewStats(filtered, filteredCreation);
  }, [category, selectedAuthor, categoryStats, ownStats, rawReviews, rawCreationReviews]);

  const isAuthorFiltered = category === "own" || selectedAuthor !== null;
  const isCategoryFiltered = category !== "all";

  // "By category" chart always shows the full scope (all reviews) but greyed when filtered
  const displayCategoryData = allStats.categoryData;
  // "By author" chart shows the current category scope, but greyed when author is selected
  const displayAuthorData = categoryStats.authorData;

  // Label for the selector button
  const selectorLabel = (() => {
    const catOption = CATEGORIES.find(c => c.key === category)!;
    if (category === "own") return `Own (${ownAuthorName})`;
    if (selectedAuthor !== null) return `${catOption.label} › ${selectedAuthor}`;
    return catOption.label;
  })();

  const isActive = category !== "all" || selectedAuthor !== null;

  const {
    totalReviews,
    favoritesCount,
    brandsCount,
    sponsoredCount,
    typeData,
    brandData,
    timeData,
    publicationYearData,
    publicationMonthData,
    postingGapData,
    tasteData,
    containerData,
    sweetenerData,
    caffeineDistData,
    alcoData,
    activityData,
    creationActivityData,
    sponsorData,
  } = stats;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <a
          href={reviewsUrl}
          className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-accent"
        >
          ← All reviews
        </a>

        {/* Unified scope selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground/40 select-none">Scope</span>
          <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(prev => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-accent/40 bg-muted text-accent"
                : "border-transparent bg-muted text-foreground/70 hover:text-foreground"
            }`}
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
          >
            <span>{selectorLabel}</span>
            <svg
              className={`h-3 w-3 opacity-60 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div
              className="absolute top-full right-0 z-50 mt-1.5 min-w-[220px] overflow-y-auto rounded-lg border border-foreground/15 bg-background p-1 shadow-lg"
              role="listbox"
            >
              {CATEGORIES.map(cat => {
                const isCatSelected = category === cat.key && selectedAuthor === null;
                const catCount = (() => {
                  switch (cat.key) {
                    case "all": return allStats.totalReviews;
                    case "own": return ownStats.totalReviews;
                    case "friendly": return friendlyStats?.totalReviews ?? 0;
                    case "subscribers": return subscriberStats?.totalReviews ?? 0;
                  }
                })();

                // Category header row
                const catRow = (
                  <button
                    key={cat.key}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
                      isCatSelected ? "font-semibold text-accent" : "text-foreground"
                    }`}
                    onClick={() => handleCategoryChange(cat.key)}
                  >
                    <span className="flex items-center gap-1.5">
                      {isCatSelected && <span>✓</span>}
                      <span>
                        {cat.key === "own"
                          ? `${cat.label} (${ownAuthorName})`
                          : cat.label}
                      </span>
                    </span>
                    <span className="text-[10px] text-foreground/40">({catCount})</span>
                  </button>
                );

                // For friendly / subscribers, show sub-authors when this category is selected
                const showSubAuthors =
                  category === cat.key &&
                  (cat.key === "friendly" || cat.key === "subscribers") &&
                  subAuthors.length > 0;

                if (!showSubAuthors) return catRow;

                return (
                  <div key={cat.key}>
                    {catRow}
                    {subAuthors.map(([authorName, count]) => {
                      const isSelected =
                        category === cat.key && selectedAuthor === authorName;
                      return (
                        <button
                          key={authorName}
                          type="button"
                          className={`flex w-full items-center justify-between rounded-md py-1.5 pr-2.5 pl-6 text-left text-xs transition-colors hover:bg-muted ${
                            isSelected ? "font-semibold text-accent" : "text-foreground/80"
                          }`}
                          onClick={() => {
                            setSelectedAuthor(authorName);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <span className="flex items-center gap-1.5">
                            {isSelected && <span>✓</span>}
                            <span>{authorName}</span>
                          </span>
                          <span className="text-[10px] text-foreground/40">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          [totalReviews, "Reviews"],
          [brandsCount, "Brands"],
          [favoritesCount, "Favorite Drinks"],
          [sponsoredCount, "Sponsored Items"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-lg bg-muted p-4 text-center">
            <div className="text-3xl font-bold text-accent">{value}</div>
            <div className="mt-1 text-xs tracking-widest text-foreground/50 uppercase">
              {label}
            </div>
          </div>
        ))}
      </div>

      {activityData.length > 0 && (
        <Card title="Publication activity">
          <ActivityGraph data={activityData} colors={colors} />
        </Card>
      )}

      {creationActivityData.length > 0 && (
        <Card title="Creation activity">
          <ActivityGraph data={creationActivityData} colors={colors} />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* By category – greyed when a specific category is active */}
        {displayCategoryData.length > 0 && (
          <Card
            title="By category"
            className={
              isCategoryFiltered
                ? "pointer-events-none opacity-35 grayscale transition-all duration-300 select-none"
                : "transition-all duration-300"
            }
          >
            <DonutChart data={displayCategoryData} colors={colors} />
          </Card>
        )}

        {/* By author – greyed when a specific author is active */}
        {displayAuthorData.length > 0 && (
          <Card
            title="By author"
            className={
              isAuthorFiltered
                ? "pointer-events-none opacity-35 grayscale transition-all duration-300 select-none"
                : "transition-all duration-300"
            }
          >
            <DonutChart data={displayAuthorData} colors={colors} />
          </Card>
        )}

        {typeData.length > 0 && (
          <Card title="By type">
            <DonutChart data={typeData} colors={colors} />
          </Card>
        )}
        {sponsorData.length > 0 && (
          <Card title="Sponsors">
            <DonutChart data={sponsorData} colors={colors} />
          </Card>
        )}
      </div>

      {timeData.length > 0 && (
        <Card title="Reviews over time">
          <TimeChart data={timeData} colors={colors} />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {publicationYearData.length > 0 && (
          <Card title="Publications by year">
            <HBarChart
              data={publicationYearData}
              colors={colors}
              height={Math.max(180, publicationYearData.length * 26)}
            />
          </Card>
        )}
        {publicationMonthData.length > 0 && (
          <Card title="Publications by month">
            <HBarChart
              data={publicationMonthData}
              colors={colors}
              height={Math.max(180, publicationMonthData.length * 26)}
            />
          </Card>
        )}
      </div>

      {postingGapData.length > 0 && (
        <Card title="Average posting gap">
          <PostingGapChart data={postingGapData} colors={colors} />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {brandData.length > 0 && (
          <Card title="Top brands">
            <HBarChart
              data={brandData}
              mono
              colors={colors}
              height={Math.max(180, brandData.length * 26)}
            />
          </Card>
        )}
        {tasteData.length > 0 && (
          <Card title="Top taste profiles">
            <HBarChart
              data={tasteData}
              colors={colors}
              height={Math.max(180, tasteData.length * 26)}
            />
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {containerData.length > 0 && (
          <Card title="Container types">
            <DonutChart data={containerData} colors={colors} />
          </Card>
        )}
        {sweetenerData.length > 0 && (
          <Card title="Sweeteners">
            <HBarChart
              data={sweetenerData}
              colors={colors}
              height={Math.max(160, sweetenerData.length * 26)}
            />
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {caffeineDistData.length > 0 && (
          <Card title="Caffeine">
            <HBarChart
              data={caffeineDistData}
              colors={colors}
              height={Math.max(160, caffeineDistData.length * 26)}
            />
          </Card>
        )}
        {alcoData.length > 0 && (
          <Card title="Alcohol">
            <HBarChart
              data={alcoData}
              colors={colors}
              height={Math.max(160, alcoData.length * 26)}
            />
          </Card>
        )}
      </div>
    </div>
  );
}


