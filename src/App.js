import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  ReferenceLine
} from 'recharts';
import {
  Calendar,
  Filter,
  TrendingUp,
  Clock,
  Target,
  ArrowLeft,
  ArrowRight,
  DollarSign,
  ChevronDown,
  CheckCircle,
  Circle,
  Image as ImageIcon,
  Eye,
  Trash2,
  X
} from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatDayPnL = (value) => {
  const numeric = Number(value) || 0;
  const absValue = Math.abs(numeric);
  const compact =
    absValue >= 1000 ? `${(absValue / 1000).toFixed(1).replace(/\.0$/, '')}k` : absValue.toFixed(0);
  const sign = numeric >= 0 ? '+' : '-';
  return `${sign}$${compact}`;
};

const monthLabel = (date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const parseISODate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const clampToToday = (date) => {
  if (!date) return null;
  const today = startOfDay(new Date());
  return date > today ? today : date;
};

const buildMonthOptions = (trades) => {
  const now = new Date();
  const nowStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let earliestTradeMonth = null;

  trades.forEach((trade) => {
    const parsed = parseISODate(trade.date);
    if (!parsed) return;
    const tradeMonth = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    if (!earliestTradeMonth || tradeMonth < earliestTradeMonth) {
      earliestTradeMonth = tradeMonth;
    }
  });

  const defaultStart = new Date(nowStart.getFullYear(), nowStart.getMonth() - 11, 1);
  const startPoint =
    earliestTradeMonth && earliestTradeMonth < defaultStart ? earliestTradeMonth : defaultStart;

  const options = [];
  const cursor = new Date(nowStart);
  while (cursor >= startPoint) {
    options.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: monthLabel(cursor),
      date: new Date(cursor)
    });
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return options;
};

const generateCalendarMatrix = (baseDate) => {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const startDay = start.getDay();
  const matrixStart = new Date(start.getFullYear(), start.getMonth(), 1 - startDay);
  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(matrixStart);
    date.setDate(matrixStart.getDate() + index);
    return {
      date,
      currentMonth: date.getMonth() === baseDate.getMonth()
    };
  });
};

const getQuickRanges = () => {
  const today = startOfDay(new Date());
  const startOfWeek = () => {
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay());
    return start;
  };
  const endOfWeek = () => {
    const end = startOfWeek();
    end.setDate(end.getDate() + 6);
    return end;
  };
  const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startOfQuarter = (date) => {
    const quarter = Math.floor(date.getMonth() / 3) * 3;
    return new Date(date.getFullYear(), quarter, 1);
  };
  const endOfQuarter = (date) => new Date(startOfQuarter(date).getFullYear(), startOfQuarter(date).getMonth() + 3, 0);

  return [
    {
      label: 'Today',
      getRange: () => ({ start: today, end: today })
    },
    {
      label: 'This Week',
      getRange: () => ({ start: startOfWeek(), end: endOfWeek() })
    },
    {
      label: 'This Month',
      getRange: () => ({ start: startOfMonth(today), end: endOfMonth(today) })
    },
    {
      label: 'Last 30 Days',
      getRange: () => {
        const end = new Date(today);
        const start = new Date(today);
        start.setDate(start.getDate() - 29);
        return { start, end };
      }
    },
    {
      label: 'Last Month',
      getRange: () => {
        const reference = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return { start: startOfMonth(reference), end: endOfMonth(reference) };
      }
    },
    {
      label: 'This Quarter',
      getRange: () => ({ start: startOfQuarter(today), end: endOfQuarter(today) })
    },
    {
      label: 'YTD',
      getRange: () => ({ start: new Date(today.getFullYear(), 0, 1), end: today })
    },
    {
      label: 'All Time',
      getRange: () => ({ start: null, end: null })
    }
  ];
};

const formatRangeLabel = (range) => {
  const formatter = { month: 'short', day: 'numeric', year: 'numeric' };
  if (!range.start && !range.end) return 'All Time';
  const startLabel = range.start
    ? range.start.toLocaleDateString('en-US', formatter)
    : '—';
  const endLabel = range.end
    ? range.end.toLocaleDateString('en-US', formatter)
    : '—';
  return `${startLabel} - ${endLabel}`;
};

const tooltipBoxStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #475569',
  padding: '10px 12px',
  minWidth: '200px'
};

const NetDailyTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0]?.value || 0;
  const pnlColor = value >= 0 ? '#22c55e' : '#f87171';

  return (
    <div style={{ ...tooltipBoxStyle }}>
      <p style={{ margin: 0, marginBottom: '4px', color: '#f8fafc', fontSize: '14px' }}>{label}</p>
      <p
        style={{
          margin: 0,
          color: pnlColor,
          fontSize: '14px',
          fontWeight: 600
        }}
      >
        Daily P&L: {currencyFormatter.format(value)}
      </p>
    </div>
  );
};

function App() {
  const [trades, setTrades] = useState(() => {
    const savedTrades = localStorage.getItem('tradingJournalTrades');
    if (!savedTrades) return [];
    try {
      return JSON.parse(savedTrades).map((trade) => ({
        ...trade,
        profitLoss: typeof trade.profitLoss === 'number' ? trade.profitLoss : 0
      }));
    } catch (error) {
      return [];
    }
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [filters, setFilters] = useState({
    timeRange: 'all',
    dayOfWeek: 'all',
    instrument: 'all'
  });
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    side: 'long',
    instrument: 'NQ!',
    result: 'win',
    riskReward: '',
    profitLoss: ''
  });

  const defaultRange = useMemo(() => {
    const today = startOfDay(new Date());
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { start, end: today };
  }, []);

  const [dateRange, setDateRange] = useState(defaultRange);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [rangeSelection, setRangeSelection] = useState(defaultRange);
  const [rangeMonth, setRangeMonth] = useState(
    () => new Date(defaultRange.end.getFullYear(), defaultRange.end.getMonth(), 1)
  );
  const quickRangePresets = useMemo(() => getQuickRanges(), []);
  const rangePickerRef = useRef(null);
  const [dayNotes, setDayNotes] = useState(() => {
    const saved = localStorage.getItem('tradingJournalDayNotes');
    if (!saved) return {};
    try {
      return JSON.parse(saved);
    } catch (error) {
      return {};
    }
  });
  const [checklistInputs, setChecklistInputs] = useState({});
  const [strategies, setStrategies] = useState(() => {
    const saved = localStorage.getItem('tradingJournalStrategies');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (error) {
      return [];
    }
  });
  const [strategyBuilderOpen, setStrategyBuilderOpen] = useState(false);
  const [editingStrategyId, setEditingStrategyId] = useState(null);
  const [strategyForm, setStrategyForm] = useState({
    name: '',
    itemInput: '',
    items: []
  });
  const [activeScreenshot, setActiveScreenshot] = useState(null);

  useEffect(() => {
    localStorage.setItem('tradingJournalTrades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('tradingJournalDayNotes', JSON.stringify(dayNotes));
  }, [dayNotes]);

  useEffect(() => {
    localStorage.setItem('tradingJournalStrategies', JSON.stringify(strategies));
  }, [strategies]);

  useEffect(() => {
    if (!activeScreenshot) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveScreenshot(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScreenshot]);

  const createDefaultDayEntry = () => ({
    notes: '',
    checklist: [],
    screenshots: [],
    strategyId: null
  });

  const updateDayEntry = (dateKey, updater) => {
    if (!dateKey) return;
    setDayNotes((prev) => {
      const current = prev[dateKey] ?? createDefaultDayEntry();
      const updated = updater(current);
      return { ...prev, [dateKey]: updated };
    });
  };

  const handleNoteChange = (dateKey, value) => {
    updateDayEntry(dateKey, (entry) => ({ ...entry, notes: value }));
  };

  const handleChecklistInputChange = (dateKey, value) => {
    setChecklistInputs((prev) => ({ ...prev, [dateKey]: value }));
  };

  const handleAddChecklistItem = (dateKey) => {
    const label = (checklistInputs[dateKey] || '').trim();
    if (!label) return;
    updateDayEntry(dateKey, (entry) => ({
      ...entry,
      checklist: [...entry.checklist, { id: Date.now(), label, checked: false }]
    }));
    setChecklistInputs((prev) => ({ ...prev, [dateKey]: '' }));
  };

  const handleChecklistToggle = (dateKey, itemId) => {
    updateDayEntry(dateKey, (entry) => ({
      ...entry,
      checklist: entry.checklist.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    }));
  };

  const handleChecklistRemove = (dateKey, itemId) => {
    updateDayEntry(dateKey, (entry) => ({
      ...entry,
      checklist: entry.checklist.filter((item) => item.id !== itemId)
    }));
  };

  const handleStrategyApply = (dateKey, strategyId) => {
    if (!dateKey) return;
    if (!strategyId) {
      updateDayEntry(dateKey, (entry) => ({ ...entry, strategyId: null }));
      return;
    }
    const template = strategies.find((strategy) => strategy.id === strategyId);
    if (!template) return;
    updateDayEntry(dateKey, (entry) => ({
      ...entry,
      strategyId: template.id,
      checklist: template.items.map((item) => ({
        id: `${Date.now()}-${item.id}`,
        label: item.label,
        checked: false
      }))
    }));
  };

  const handleStrategyFormChange = (field, value) => {
    setStrategyForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStrategyFormAddItem = () => {
    const label = strategyForm.itemInput.trim();
    if (!label) return;
    setStrategyForm((prev) => ({
      ...prev,
      itemInput: '',
      items: [...prev.items, { id: Date.now(), label }]
    }));
  };

  const handleStrategyFormRemoveItem = (itemId) => {
    setStrategyForm((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId)
    }));
  };

  const resetStrategyForm = () => {
    setStrategyForm({
      name: '',
      itemInput: '',
      items: []
    });
  };

  const openNewStrategyBuilder = () => {
    setEditingStrategyId(null);
    resetStrategyForm();
    setStrategyBuilderOpen(true);
  };

  const closeStrategyBuilder = () => {
    setStrategyBuilderOpen(false);
    setEditingStrategyId(null);
    resetStrategyForm();
  };

  const handleStrategyBuilderToggle = () => {
    if (strategyBuilderOpen) {
      closeStrategyBuilder();
    } else {
      openNewStrategyBuilder();
    }
  };

  const handleStrategySave = () => {
    const name = strategyForm.name.trim();
    if (!name || strategyForm.items.length === 0) return;
    const formattedItems = strategyForm.items.map((item) => ({
      id: item.id,
      label: item.label
    }));

    if (editingStrategyId) {
      setStrategies((prev) =>
        prev.map((strategy) =>
          strategy.id === editingStrategyId ? { ...strategy, name, items: formattedItems } : strategy
        )
      );
    } else {
      const newStrategy = {
        id: Date.now(),
        name,
        items: formattedItems
      };
      setStrategies((prev) => [...prev, newStrategy]);
    }

    closeStrategyBuilder();
  };

  const handleStrategyEdit = (strategyId) => {
    const template = strategies.find((strategy) => strategy.id === strategyId);
    if (!template) return;
    setStrategyForm({
      name: template.name,
      itemInput: '',
      items: template.items.map((item) => ({
        id: item.id,
        label: item.label
      }))
    });
    setEditingStrategyId(strategyId);
    setStrategyBuilderOpen(true);
  };

  const handleStrategyDelete = (strategyId) => {
    if (!strategyId) return;
    setStrategies((prev) => prev.filter((strategy) => strategy.id !== strategyId));
    setDayNotes((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (updated[key]?.strategyId === strategyId) {
          updated[key] = { ...updated[key], strategyId: null };
        }
      });
      return updated;
    });
    closeStrategyBuilder();
  };

  const handleScreenshotUpload = (dateKey, files) => {
    if (!files || files.length === 0) return;
    const uploads = Array.from(files).map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              id: `${Date.now()}-${file.name}`,
              name: file.name,
              dataUrl: reader.result
            });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );

    Promise.all(uploads)
      .then((images) => {
        updateDayEntry(dateKey, (entry) => ({
          ...entry,
          screenshots: [...entry.screenshots, ...images]
        }));
      })
      .catch(() => {});
  };

  const handleScreenshotRemove = (dateKey, imageId) => {
    updateDayEntry(dateKey, (entry) => ({
      ...entry,
      screenshots: entry.screenshots.filter((img) => img.id !== imageId)
    }));
  };

  useEffect(() => {
    setSelectedDay(null);
  }, [selectedMonth]);

  useEffect(() => {
    if (rangePickerOpen) {
      setRangeSelection(dateRange);
      const anchor = dateRange.end || dateRange.start || startOfDay(new Date());
      setRangeMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    }
  }, [rangePickerOpen, dateRange]);

  useEffect(() => {
    if (!rangePickerOpen) return undefined;
    const handler = (event) => {
      if (rangePickerRef.current && !rangePickerRef.current.contains(event.target)) {
        setRangePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [rangePickerOpen]);

  const handleAddTrade = () => {
    if (!formData.date || !formData.time || !formData.riskReward || !formData.profitLoss) {
      alert('Please fill in all fields');
      return;
    }

    const parsedRiskReward = parseFloat(formData.riskReward);
    const parsedProfitLoss = parseFloat(formData.profitLoss);

    if (Number.isNaN(parsedRiskReward) || Number.isNaN(parsedProfitLoss)) {
      alert('Please enter valid numbers for Risk Reward and Profit/Loss');
      return;
    }

    const signedProfitLoss =
      formData.result === 'loss' ? -Math.abs(parsedProfitLoss) : Math.abs(parsedProfitLoss);
    const normalizedRiskReward = formData.result === 'loss' ? -1 : parsedRiskReward;

    const newTrade = {
      id: Date.now(),
      date: formData.date,
      time: formData.time,
      side: formData.side,
      instrument: formData.instrument,
      result: formData.result,
      riskReward: normalizedRiskReward,
      profitLoss: signedProfitLoss
    };

    if (editingTrade) {
      setTrades((prev) =>
        prev.map((trade) => (trade.id === editingTrade.id ? { ...newTrade, id: editingTrade.id } : trade))
      );
      setEditingTrade(null);
    } else {
      setTrades((prev) => [...prev, newTrade]);
    }

    setFormData({
      date: '',
      time: '',
      side: 'long',
      instrument: 'NQ!',
      result: 'win',
      riskReward: '',
      profitLoss: ''
    });
    setShowAddForm(false);
  };

  const handleEditTrade = (trade) => {
    setEditingTrade(trade);
    setFormData({
      date: trade.date,
      time: trade.time,
      side: trade.side,
      instrument: trade.instrument,
      result: trade.result,
      riskReward:
        trade.result === 'loss'
          ? '-1'
          : (trade.riskReward ?? '').toString(),
      profitLoss:
        trade.profitLoss !== undefined && trade.profitLoss !== null
          ? Math.abs(trade.profitLoss).toString()
          : ''
    });
    setShowAddForm(true);
  };

  const handleDeleteTrade = (id) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      setTrades((prev) => prev.filter((trade) => trade.id !== id));
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingTrade(null);
    setFormData({
      date: '',
      time: '',
      side: 'long',
      instrument: 'NQ!',
      result: 'win',
      riskReward: '',
      profitLoss: ''
    });
  };

  const handleResultChange = (value) => {
    setFormData((prev) => {
      const currentValue = Number(prev.riskReward);
      const adjusted =
        value === 'loss'
          ? '-1'
          : Number.isNaN(currentValue)
            ? prev.riskReward
            : Math.abs(currentValue).toString();
      return { ...prev, result: value, riskReward: adjusted };
    });
  };

  const getTimeRange = (time) => {
    if (!time) return 'unknown';
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes >= 570 && totalMinutes < 585) return '9:30-9:45';
    if (totalMinutes >= 585 && totalMinutes < 600) return '9:45-10:00';
    if (totalMinutes >= 600 && totalMinutes < 615) return '10:00-10:15';
    if (totalMinutes >= 615 && totalMinutes < 630) return '10:15-10:30';
    return '10:30+';
  };

  const getDayOfWeek = (dateStr) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = parseISODate(dateStr);
    return date ? days[date.getDay()] : 'Unknown';
  };

  const rangeFilteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const tradeDate = parseISODate(trade.date);
      if (!tradeDate) return false;
      if (dateRange.start && tradeDate < dateRange.start) return false;
      if (dateRange.end && tradeDate > dateRange.end) return false;
      return true;
    });
  }, [trades, dateRange]);

  const filteredTrades = useMemo(() => {
    return rangeFilteredTrades.filter((trade) => {
      const timeRange = getTimeRange(trade.time);
      const dayOfWeek = getDayOfWeek(trade.date);

      if (filters.timeRange !== 'all' && timeRange !== filters.timeRange) return false;
      if (filters.dayOfWeek !== 'all' && dayOfWeek !== filters.dayOfWeek) return false;
      if (filters.instrument !== 'all' && trade.instrument !== filters.instrument) return false;

      return true;
    });
  }, [rangeFilteredTrades, filters]);

  const metrics = useMemo(() => {
    const wins = filteredTrades.filter((trade) => trade.result === 'win').length;
    const losses = filteredTrades.filter((trade) => trade.result === 'loss').length;
    const total = filteredTrades.length;

    const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : '0.00';

    const totalWinRR = filteredTrades
      .filter((trade) => trade.result === 'win')
      .reduce((sum, trade) => sum + trade.riskReward, 0);

    const totalLossRR = Math.abs(
      filteredTrades
        .filter((trade) => trade.result === 'loss')
        .reduce((sum, trade) => sum + trade.riskReward, 0)
    );

    const profitFactor = totalLossRR > 0 ? (totalWinRR / totalLossRR).toFixed(2) : totalWinRR > 0 ? '∞' : '0.00';

    const avgRR = total > 0
      ? (filteredTrades.reduce((sum, trade) => sum + trade.riskReward, 0) / total).toFixed(2)
      : '0.00';

    const netPnL = filteredTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);

    return { wins, losses, total, winRate, profitFactor, avgRR, netPnL };
  }, [filteredTrades]);

  const timeRangeData = useMemo(() => {
    const ranges = ['9:30-9:45', '9:45-10:00', '10:00-10:15', '10:15-10:30', '10:30+'];
    return ranges.map((range) => {
      const rangeTrades = filteredTrades.filter((trade) => getTimeRange(trade.time) === range);
      const wins = rangeTrades.filter((trade) => trade.result === 'win').length;
      const total = rangeTrades.length;
      return {
        range,
        winRate: total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0,
        trades: total
      };
    });
  }, [filteredTrades]);

  const dayData = useMemo(() => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return days.map((day) => {
      const dayTrades = filteredTrades.filter((trade) => getDayOfWeek(trade.date) === day);
      const wins = dayTrades.filter((trade) => trade.result === 'win').length;
      const total = dayTrades.length;
      return {
        day,
        winRate: total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0,
        trades: total
      };
    });
  }, [filteredTrades]);

  const dailyPnLData = useMemo(() => {
    const dailyTotals = filteredTrades.reduce((acc, trade) => {
      if (!trade.date) return acc;
      acc[trade.date] = (acc[trade.date] || 0) + (trade.profitLoss || 0);
      return acc;
    }, {});

    const sortedKeys = Object.keys(dailyTotals).sort();
    const today = startOfDay(new Date());
    const defaultStart = dateRange.start
      ? startOfDay(dateRange.start)
      : sortedKeys.length
        ? startOfDay(parseISODate(sortedKeys[0]))
        : startOfDay(new Date());
    const defaultEnd = dateRange.end
      ? startOfDay(dateRange.end)
      : sortedKeys.length
        ? startOfDay(parseISODate(sortedKeys[sortedKeys.length - 1]))
        : defaultStart;

    let cursor = defaultStart ? new Date(defaultStart) : new Date(today);
    let endDate = defaultEnd ? new Date(defaultEnd) : new Date(today);
    if (cursor > today) cursor = new Date(today);
    if (endDate > today) endDate = new Date(today);
    if (endDate < cursor) endDate = new Date(cursor);

    const data = [];
    while (cursor <= endDate) {
      const key = formatDateKey(cursor);
      data.push({
        date: key,
        pnl: dailyTotals[key] || 0,
        label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return data;
  }, [filteredTrades, dateRange]);

  const cumulativePnLData = useMemo(() => {
    let cumulative = 0;
    return dailyPnLData.map((entry) => {
      cumulative += entry.pnl;
      return { ...entry, cumulative };
    });
  }, [dailyPnLData]);

  const instrumentData = useMemo(() => {
    const instruments = Array.from(new Set(trades.map((trade) => trade.instrument)));
    return instruments.map((instrument) => {
      const instTrades = filteredTrades.filter((trade) => trade.instrument === instrument);
      const wins = instTrades.filter((trade) => trade.result === 'win').length;
      const total = instTrades.length;
      const pnl = instTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
      return {
        instrument,
        wins,
        losses: total - wins,
        winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0',
        pnl
      };
    });
  }, [filteredTrades, trades]);

  const tradesByDate = useMemo(() => {
    return trades.reduce((acc, trade) => {
      if (!trade.date) return acc;
      if (!acc[trade.date]) {
        acc[trade.date] = { wins: 0, losses: 0, profitLoss: 0, trades: [] };
      }
      if (trade.result === 'win') acc[trade.date].wins += 1;
      if (trade.result === 'loss') acc[trade.date].losses += 1;
      acc[trade.date].profitLoss += trade.profitLoss || 0;
      acc[trade.date].trades.push(trade);
      return acc;
    }, {});
  }, [trades]);

  const calendarCells = useMemo(() => {
    const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const startDay = start.getDay();
    const totalDays = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < startDay; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [selectedMonth]);

  const monthOptions = useMemo(() => buildMonthOptions(trades), [trades]);
  const currentMonthStart = useMemo(() => {
    const nowDate = new Date();
    return new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
  }, []);
  const earliestAvailableMonth = monthOptions[monthOptions.length - 1]?.date ?? null;

  const selectedDayTrades = useMemo(() => {
    if (!selectedDay) return [];
    return tradesByDate[selectedDay]?.trades ?? [];
  }, [selectedDay, tradesByDate]);

  const selectedDayEntry = selectedDay
    ? dayNotes[selectedDay] ?? createDefaultDayEntry()
    : null;
  const selectedDayChecklistInput = selectedDay ? checklistInputs[selectedDay] || '' : '';
  const isEditingStrategy = Boolean(editingStrategyId);

  const handleMonthChange = (offset) => {
    setSelectedMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
      if (next > currentMonthStart) {
        return prev;
      }
      if (earliestAvailableMonth && next < earliestAvailableMonth) {
        return prev;
      }
      return next;
    });
  };

  const handleMonthSelect = (value) => {
    const [year, monthIndex] = value.split('-').map(Number);
    if (Number.isNaN(year) || Number.isNaN(monthIndex)) return;
    const target = new Date(year, monthIndex, 1);
    if (target > currentMonthStart) {
      setSelectedMonth(currentMonthStart);
      return;
    }
    if (earliestAvailableMonth && target < earliestAvailableMonth) {
      setSelectedMonth(earliestAvailableMonth);
      return;
    }
    setSelectedMonth(target);
  };

  const selectedDayDate = selectedDay ? parseISODate(selectedDay) : null;
  const selectedDayLabel = selectedDayDate
    ? selectedDayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : 'Journal Entry';

  const rangeMonthNext = new Date(rangeMonth.getFullYear(), rangeMonth.getMonth() + 1, 1);
  const rangeCalendar = (monthDate) => {
    const days = generateCalendarMatrix(monthDate);
    return (
      <div>
        <div className="text-center text-slate-200 font-semibold mb-2">{monthLabel(monthDate)}</div>
        <div className="grid grid-cols-7 gap-1 text-[11px] text-slate-400 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
            <div key={`${monthDate}-${day}`} className="text-center">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(({ date, currentMonth }) => {
            const dayKey = startOfDay(date).getTime();
            const selectionStart = rangeSelection.start ? rangeSelection.start.getTime() : null;
            const selectionEnd = rangeSelection.end ? rangeSelection.end.getTime() : null;
            const isStart = selectionStart && dayKey === selectionStart;
            const isEnd = selectionEnd && dayKey === selectionEnd;
            const inRange =
              selectionStart && selectionEnd
                ? dayKey >= selectionStart && dayKey <= selectionEnd
                : selectionStart && !selectionEnd
                  ? dayKey === selectionStart
                  : false;

            return (
              <button
                key={`${monthDate.toISOString()}-${dayKey}`}
                onClick={() => {
                  const normalized = startOfDay(date);
                  if (!rangeSelection.start || (rangeSelection.start && rangeSelection.end)) {
                    setRangeSelection({ start: normalized, end: null });
                  } else if (normalized < rangeSelection.start) {
                    setRangeSelection({ start: normalized, end: rangeSelection.start });
                  } else if (normalized.getTime() === rangeSelection.start.getTime()) {
                    setRangeSelection({ start: normalized, end: null });
                  } else {
                    setRangeSelection({ start: rangeSelection.start, end: normalized });
                  }
                }}
                className={`h-8 text-xs rounded-md border transition-colors ${
                  currentMonth ? 'text-slate-200' : 'text-slate-500'
                } ${
                  inRange
                    ? 'bg-purple-600/40 border-purple-400'
                    : 'bg-slate-800/70 border-slate-700 hover:border-purple-400'
                } ${isStart || isEnd ? 'ring-2 ring-purple-300' : ''}`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const applyRangeSelection = () => {
    if (!rangeSelection.start) return;
    const today = startOfDay(new Date());
    const finalRange = {
      start: rangeSelection.start > today ? today : rangeSelection.start,
      end: rangeSelection.end
        ? rangeSelection.end > today
          ? today
          : rangeSelection.end
        : rangeSelection.start > today
          ? today
          : rangeSelection.start
    };
    if (finalRange.start > finalRange.end) {
      finalRange.start = finalRange.end;
    }
    setDateRange(finalRange);
    setRangePickerOpen(false);
  };

  const clearRangeSelection = () => {
    const allTime = { start: null, end: null };
    setDateRange(allTime);
    setRangeSelection(allTime);
    const now = startOfDay(new Date());
    setRangeMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setRangePickerOpen(false);
  };

  const handleQuickRange = (getRange) => {
    const range = getRange();
    if (range.start) range.start = clampToToday(startOfDay(range.start));
    if (range.end) range.end = clampToToday(startOfDay(range.end));
    setDateRange(range);
    setRangeSelection(range);
    const anchor = range.end || range.start || startOfDay(new Date());
    setRangeMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    setRangePickerOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Trading Journal
            </h1>
            <p className="text-slate-400">Track and analyze your trading performance</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Add Trade
          </button>
        </div>

        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700">
              <h3 className="text-2xl font-bold mb-4">{editingTrade ? 'Edit Trade' : 'Add New Trade'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Side</label>
                    <select
                      value={formData.side}
                      onChange={(e) => setFormData({ ...formData, side: e.target.value })}
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
                    >
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Instrument</label>
                    <select
                      value={formData.instrument}
                      onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
                    >
                      <option value="NQ!">NQ!</option>
                      <option value="ES1!">ES1!</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Result</label>
                    <select
                      value={formData.result}
                      onChange={(e) => handleResultChange(e.target.value)}
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
                    >
                      <option value="win">Win</option>
                      <option value="loss">Loss</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Risk Reward (R)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.riskReward}
                      onChange={(e) => setFormData({ ...formData, riskReward: e.target.value })}
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none disabled:opacity-60"
                      placeholder="e.g., 2.5"
                      disabled={formData.result === 'loss'}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Profit / Loss ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.profitLoss}
                    onChange={(e) => setFormData({ ...formData, profitLoss: e.target.value })}
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
                    placeholder="Enter trade P/L"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleAddTrade}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 px-4 py-2 rounded-lg font-semibold transition-all"
                  >
                    {editingTrade ? 'Update' : 'Add'} Trade
                  </button>
                  <button
                    onClick={cancelForm}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700 relative z-20">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-semibold">Filters</h2>
            </div>
            <div className="relative w-full sm:w-auto" ref={rangePickerRef}>
              <button
                onClick={() => setRangePickerOpen((prev) => !prev)}
                className="w-full sm:w-auto bg-slate-900/80 border border-slate-600 hover:border-purple-400 px-4 py-2 rounded-lg flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-300" />
                  <span>{formatRangeLabel(dateRange)}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-300" />
              </button>
              {rangePickerOpen && (
                <div className="absolute right-0 mt-2 w-full sm:w-[620px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-40 flex flex-col gap-2">
                      {quickRangePresets.map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => handleQuickRange(preset.getRange)}
                          className="text-left text-sm px-3 py-2 rounded-lg bg-slate-800 hover:bg-purple-600/30 border border-slate-700 hover:border-purple-400"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => setRangeMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="text-sm text-slate-300">
                          {monthLabel(rangeMonth)} · {monthLabel(rangeMonthNext)}
                        </div>
                        <button
                          onClick={() => setRangeMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {rangeCalendar(rangeMonth)}
                        {rangeCalendar(rangeMonthNext)}
                      </div>
                      <div className="mt-4 flex justify-end gap-2 text-sm">
                        <button
                          onClick={clearRangeSelection}
                          className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:border-purple-400"
                        >
                          Clear
                        </button>
                        <button
                          onClick={applyRangeSelection}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Time Range</label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
                className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
              >
                <option value="all">All Times</option>
                <option value="9:30-9:45">9:30 - 9:45</option>
                <option value="9:45-10:00">9:45 - 10:00</option>
                <option value="10:00-10:15">10:00 - 10:15</option>
                <option value="10:15-10:30">10:15 - 10:30</option>
                <option value="10:30+">10:30+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Day of Week</label>
              <select
                value={filters.dayOfWeek}
                onChange={(e) => setFilters({ ...filters, dayOfWeek: e.target.value })}
                className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
              >
                <option value="all">All Days</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Instrument</label>
              <select
                value={filters.instrument}
                onChange={(e) => setFilters({ ...filters, instrument: e.target.value })}
                className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
              >
                <option value="all">All Instruments</option>
                {Array.from(new Set(trades.map((trade) => trade.instrument))).map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-6 border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Win Rate</span>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-green-400">{metrics.winRate}%</div>
            <div className="text-sm text-slate-400 mt-1">
              {metrics.wins}W / {metrics.losses}L
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Avg Risk Reward</span>
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-purple-400">{metrics.avgRR}</div>
            <div className="text-sm text-slate-400 mt-1">Per trade</div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-xl p-6 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Profit Factor</span>
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-cyan-400">{metrics.profitFactor}</div>
            <div className="text-sm text-slate-400 mt-1">Wins vs Losses</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl p-6 border border-orange-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Total Trades</span>
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-orange-400">{metrics.total}</div>
            <div className="text-sm text-slate-400 mt-1">Filtered</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl p-6 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Net P&L</span>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className={`text-3xl font-bold ${metrics.netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {currencyFormatter.format(metrics.netPnL)}
            </div>
            <div className="text-sm text-slate-400 mt-1">Selected range</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 relative z-0">
            <h3 className="text-xl font-semibold mb-4">Daily Net Cumulative P&L</h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={cumulativePnLData}
                margin={{ left: 50, right: 20, top: 20, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="label" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" tickFormatter={(value) => currencyFormatter.format(value)} />
                <Tooltip
                  contentStyle={{ ...tooltipBoxStyle }}
                  formatter={(value) => [currencyFormatter.format(value), 'Cumulative P&L']}
                />
                <Area type="monotone" dataKey="cumulative" stroke="#22c55e" fillOpacity={1} fill="url(#cumulativeGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 relative z-0">
            <h3 className="text-xl font-semibold mb-4">Net Daily P&L</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={dailyPnLData}
                margin={{ left: 50, right: 20, top: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="label" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" tickFormatter={(value) => currencyFormatter.format(value)} />
                <Tooltip content={<NetDailyTooltip />} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {dailyPnLData.map((entry) => (
                    <Cell key={entry.date} fill={entry.pnl >= 0 ? '#22c55e' : '#f87171'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-semibold mb-4">Win Rate by Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timeRangeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="range" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  formatter={(value) => [`${value}%`, 'Win Rate']}
                />
                <Bar dataKey="winRate" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-semibold mb-4">Win Rate by Day</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  formatter={(value) => [`${value}%`, 'Win Rate']}
                />
                <Bar dataKey="winRate" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <h3 className="text-xl font-semibold">Trading Calendar</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMonthChange(-1)}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <select
                value={`${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`}
                onChange={(e) => handleMonthSelect(e.target.value)}
                className="bg-slate-700 rounded-lg px-3 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
              >
                {monthOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleMonthChange(1)}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-16 rounded-lg bg-slate-800/50" />;
              }

              const dateKey = formatDateKey(date);
              const dayData = tradesByDate[dateKey];
              const hasTrades = Boolean(dayData);
              const isPositive = (dayData?.profitLoss || 0) >= 0;

              return (
                <button
                  key={dateKey}
                  onClick={() =>
                    setSelectedDay((prev) => (prev === dateKey ? null : dateKey))
                  }
                  title={
                    hasTrades
                      ? `${date.toLocaleDateString()} • ${dayData.wins}W/${dayData.losses}L • ${currencyFormatter.format(
                          dayData.profitLoss
                        )}`
                      : `${date.toLocaleDateString()} • No trades`
                  }
                  className={`h-16 rounded-lg flex flex-col items-center justify-center text-[11px] transition-transform hover:scale-105 border ${
                    hasTrades
                      ? isPositive
                        ? 'bg-green-500/30 border-green-500/40 text-green-100'
                        : 'bg-red-500/30 border-red-500/40 text-red-100'
                      : 'bg-slate-800/70 border-slate-700 text-slate-300'
                  } ${selectedDay === dateKey ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900' : ''}`}
                >
                  <div className="font-semibold text-sm">{date.getDate()}</div>
                  <div className="text-[10px]">
                    {hasTrades ? `${dayData.wins}W/${dayData.losses}L` : 'No trades'}
                  </div>
                  <div
                    className={`text-[10px] font-semibold ${
                      hasTrades ? (isPositive ? 'text-green-100' : 'text-red-100') : 'text-slate-500'
                    }`}
                  >
                    {hasTrades ? formatDayPnL(dayData.profitLoss) : ''}
                  </div>
                </button>
              );
            })}
          </div>
          {selectedDay && selectedDayEntry && (
            <div className="mt-4 bg-slate-900/60 rounded-xl p-4 border border-slate-700">
              <h4 className="text-lg font-semibold mb-4">{selectedDayLabel}</h4>
              <div className="space-y-6">
                <div>
                  <h5 className="text-sm uppercase tracking-wide text-slate-400 mb-2">Trades</h5>
                  {selectedDayTrades.length === 0 ? (
                    <p className="text-slate-500 text-sm">No trades recorded for this date.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {selectedDayTrades.map((trade) => (
                        <div
                          key={trade.id}
                          className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/60 rounded-lg px-3 py-2 text-sm"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">{trade.instrument}</span>
                            <span className="text-slate-400 text-xs">
                              {trade.time} · {trade.side.toUpperCase()} · {trade.result === 'win' ? 'Win' : 'Loss'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${trade.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {currencyFormatter.format(trade.profitLoss)}
                            </div>
                            <div className="text-xs text-slate-400">{trade.riskReward}R</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <h5 className="text-sm uppercase tracking-wide text-slate-400 mb-2">Journal Notes</h5>
                    <textarea
                      value={selectedDayEntry.notes}
                      onChange={(e) => handleNoteChange(selectedDay, e.target.value)}
                      rows={5}
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                      placeholder="Document market context, psychology, mistakes, lessons..."
                    />
                    <div className="mt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <span className="text-sm uppercase tracking-wide text-slate-400">Strategy Checklist</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {strategies.length > 0 && (
                            <select
                              value={selectedDayEntry.strategyId || ''}
                              onChange={(e) =>
                                handleStrategyApply(
                                  selectedDay,
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              className="bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-1 text-xs focus:outline-none focus:border-purple-400"
                            >
                              <option value="">Choose strategy</option>
                              {strategies.map((strategy) => (
                                <option key={strategy.id} value={strategy.id}>
                                  {strategy.name}
                                </option>
                              ))}
                            </select>
                          )}
                          <button
                            onClick={handleStrategyBuilderToggle}
                            className="px-2 py-1 text-xs rounded-lg border border-purple-400 text-purple-200 hover:bg-purple-500/20 transition-colors"
                          >
                            {strategyBuilderOpen ? 'Close Builder' : 'New Strategy'}
                          </button>
                        </div>
                      </div>
                      {selectedDayEntry.strategyId &&
                        strategies.some((strategy) => strategy.id === selectedDayEntry.strategyId) && (
                          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 mb-3">
                            <span>
                              Applied:{' '}
                              {
                                strategies.find((strategy) => strategy.id === selectedDayEntry.strategyId)?.name
                              }
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleStrategyEdit(selectedDayEntry.strategyId)}
                                className="text-purple-300 hover:text-purple-200"
                              >
                                Edit Strategy
                              </button>
                              <button
                                onClick={() => handleStrategyApply(selectedDay, null)}
                                className="text-red-300 hover:text-red-200"
                              >
                                Clear Strategy
                              </button>
                            </div>
                          </div>
                        )}
                      {strategyBuilderOpen && (
                        <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3 mb-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              {isEditingStrategy ? 'Edit strategy' : 'Create strategy'}
                            </p>
                            {isEditingStrategy && (
                              <button
                                onClick={() => handleStrategyDelete(editingStrategyId)}
                                className="text-xs px-3 py-1 rounded-lg border border-red-400 text-red-200 hover:bg-red-500/20 transition-colors"
                              >
                                Delete Strategy
                              </button>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">
                              Strategy Name
                            </label>
                            <input
                              type="text"
                              value={strategyForm.name}
                              onChange={(e) => handleStrategyFormChange('name', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                              placeholder="e.g., London Sweep + NY Reversal"
                            />
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">
                              Checklist Items
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={strategyForm.itemInput}
                                onChange={(e) => handleStrategyFormChange('itemInput', e.target.value)}
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                                placeholder="Add condition"
                              />
                              <button
                                onClick={handleStrategyFormAddItem}
                                className="px-3 py-2 text-xs rounded-lg bg-purple-600/70 hover:bg-purple-600 transition-colors"
                              >
                                Add Step
                              </button>
                            </div>
                            {strategyForm.items.length > 0 && (
                              <ul className="mt-2 space-y-2">
                                {strategyForm.items.map((item) => (
                                  <li
                                    key={item.id}
                                    className="flex items-center justify-between bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                                  >
                                    <span>{item.label}</span>
                                    <button
                                      onClick={() => handleStrategyFormRemoveItem(item.id)}
                                      className="text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="flex justify-end gap-2 text-xs">
                            <button
                              onClick={closeStrategyBuilder}
                              className="px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:border-purple-400"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleStrategySave}
                              className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600"
                            >
                              {isEditingStrategy ? 'Update Strategy' : 'Save Strategy'}
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={selectedDayChecklistInput}
                          onChange={(e) => handleChecklistInputChange(selectedDay, e.target.value)}
                          placeholder="Add checklist step"
                          className="flex-1 bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-1 text-xs focus:outline-none focus:border-purple-400"
                        />
                        <button
                          onClick={() => handleAddChecklistItem(selectedDay)}
                          className="px-2 py-1 text-xs rounded-lg bg-purple-600/60 hover:bg-purple-600 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      {selectedDayEntry.checklist.length === 0 ? (
                        <p className="text-slate-500 text-xs">Create steps you expect to see before entering trades.</p>
                      ) : (
                        <ul className="space-y-2">
                          {selectedDayEntry.checklist.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                            >
                              <button
                                onClick={() => handleChecklistToggle(selectedDay, item.id)}
                                className="flex items-center gap-2"
                              >
                                {item.checked ? (
                                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                                ) : (
                                  <Circle className="w-5 h-5 text-slate-500" />
                                )}
                                <span className={item.checked ? 'line-through text-slate-400' : ''}>{item.label}</span>
                              </button>
                              <button
                                onClick={() => handleChecklistRemove(selectedDay, item.id)}
                                className="text-slate-500 hover:text-red-400 transition-colors"
                                aria-label="Remove checklist item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm uppercase tracking-wide text-slate-400">Screenshots</span>
                      <label className="inline-flex items-center gap-2 text-xs cursor-pointer text-purple-300 hover:text-purple-100">
                        <ImageIcon className="w-4 h-4" />
                        <span>Attach</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            handleScreenshotUpload(selectedDay, e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    {selectedDayEntry.screenshots.length === 0 ? (
                      <p className="text-slate-500 text-xs">Attach chart screenshots or markups for this session.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {selectedDayEntry.screenshots.map((shot) => (
                          <div
                            key={shot.id}
                            className="relative group rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden"
                          >
                            <img
                              src={shot.dataUrl}
                              alt={shot.name}
                              className="w-full h-52 md:h-64 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <button
                                onClick={() => setActiveScreenshot(shot)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-900/80 rounded-lg border border-slate-600 hover:border-purple-400"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                              <button
                                onClick={() => handleScreenshotRemove(selectedDay, shot.id)}
                                className="p-2 rounded-lg bg-red-500/80 text-white"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700">
          <h3 className="text-xl font-semibold mb-4">Performance by Instrument</h3>
          {instrumentData.length === 0 ? (
            <p className="text-slate-400 text-sm">No trades recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {instrumentData.map((inst) => (
                <div key={inst.instrument} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold">{inst.instrument}</h4>
                    <span className="text-2xl font-bold text-purple-400">{inst.winRate}%</span>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="text-sm text-slate-400">Wins</div>
                      <div className="text-xl font-semibold text-green-400">{inst.wins}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-400">Losses</div>
                      <div className="text-xl font-semibold text-red-400">{inst.losses}</div>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-sm text-slate-400">Net P&L</div>
                      <div className={`text-xl font-semibold ${inst.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {currencyFormatter.format(inst.pnl)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold mb-4">Trade Log</h3>
          {filteredTrades.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg mb-4">No trades match the current filters</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 inline-flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                Add Trade
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Time</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Side</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Instrument</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Result</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Risk Reward</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Profit / Loss</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4">{trade.date}</td>
                      <td className="py-3 px-4">{trade.time}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            trade.side === 'long'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{trade.instrument}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            trade.result === 'win' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {trade.result === 'win' ? '✓ WIN' : '✗ LOSS'}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${
                        trade.riskReward > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.riskReward > 0 ? '+' : ''}
                        {trade.riskReward}R
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${
                        trade.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {currencyFormatter.format(trade.profitLoss || 0)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleEditTrade(trade)}
                          className="text-cyan-400 hover:text-cyan-300 px-2 py-1 text-sm transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTrade(trade.id)}
                          className="text-red-400 hover:text-red-300 px-2 py-1 text-sm transition-colors ml-2"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {activeScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot preview"
          onClick={() => setActiveScreenshot(null)}
        >
          <div
            className="relative max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveScreenshot(null)}
              className="absolute -top-4 -right-4 bg-slate-900/80 border border-slate-700 rounded-full p-2 text-slate-200 hover:text-white hover:border-purple-400"
              aria-label="Close screenshot preview"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={activeScreenshot.dataUrl}
              alt={activeScreenshot.name}
              className="w-full max-h-[80vh] object-contain rounded-lg border border-slate-700 bg-slate-900"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
              <span className="truncate">{activeScreenshot.name}</span>
              <a
                href={activeScreenshot.dataUrl}
                download={activeScreenshot.name}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-600 hover:border-purple-400 bg-slate-900/70"
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
