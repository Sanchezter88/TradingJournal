import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  AreaChart,
  Area
} from 'recharts';
import {
  Calendar,
  Filter,
  TrendingUp,
  Clock,
  Target,
  ArrowLeft,
  ArrowRight,
  DollarSign
} from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

const periodOptions = [
  { value: 'mtd', label: 'Month to Date' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'all', label: 'All Time' }
];

const getPeriodStartDate = (period) => {
  const now = new Date();
  switch (period) {
    case 'mtd':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case '3m':
      return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    case '6m':
      return new Date(now.getFullYear(), now.getMonth() - 5, 1);
    case 'ytd':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
};

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

const monthLabel = (date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [filters, setFilters] = useState({
    timeRange: 'all',
    dayOfWeek: 'all',
    instrument: 'all',
    search: ''
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

  useEffect(() => {
    localStorage.setItem('tradingJournalTrades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    setSelectedDay(null);
  }, [selectedMonth]);

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

    const newTrade = {
      id: Date.now(),
      date: formData.date,
      time: formData.time,
      side: formData.side,
      instrument: formData.instrument,
      result: formData.result,
      riskReward: parsedRiskReward,
      profitLoss: parsedProfitLoss
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
      riskReward: trade.riskReward.toString(),
      profitLoss: trade.profitLoss?.toString() ?? ''
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

  const periodFilteredTrades = useMemo(() => {
    const startDate = getPeriodStartDate(selectedPeriod);
    if (!startDate) return trades;
    return trades.filter((trade) => {
      const tradeDate = parseISODate(trade.date);
      return tradeDate && tradeDate >= startDate;
    });
  }, [trades, selectedPeriod]);

  const filteredTrades = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    return periodFilteredTrades.filter((trade) => {
      const timeRange = getTimeRange(trade.time);
      const dayOfWeek = getDayOfWeek(trade.date);

      if (filters.timeRange !== 'all' && timeRange !== filters.timeRange) return false;
      if (filters.dayOfWeek !== 'all' && dayOfWeek !== filters.dayOfWeek) return false;
      if (filters.instrument !== 'all' && trade.instrument !== filters.instrument) return false;
      if (searchTerm && !trade.instrument.toLowerCase().includes(searchTerm)) return false;

      return true;
    });
  }, [periodFilteredTrades, filters]);

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

  const pnlData = useMemo(() => {
    const grouped = filteredTrades.reduce((acc, trade) => {
      if (!trade.date) return acc;
      const key = trade.date;
      if (!acc[key]) acc[key] = { date: key, pnl: 0 };
      acc[key].pnl += trade.profitLoss || 0;
      return acc;
    }, {});

    const sorted = Object.values(grouped).sort((a, b) => (a.date > b.date ? 1 : -1));
    let cumulative = 0;
    return sorted.map((entry) => {
      cumulative += entry.pnl;
      return {
        ...entry,
        label: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cumulative
      };
    });
  }, [filteredTrades]);

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

  const monthOptions = useMemo(() => {
    const map = new Map();
    trades.forEach((trade) => {
      const date = parseISODate(trade.date);
      if (!date) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: monthLabel(new Date(date.getFullYear(), date.getMonth(), 1)),
          date: new Date(date.getFullYear(), date.getMonth(), 1)
        });
      }
    });

    const now = new Date();
    const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
    if (!map.has(currentKey)) {
      map.set(currentKey, {
        key: currentKey,
        label: monthLabel(new Date(now.getFullYear(), now.getMonth(), 1)),
        date: new Date(now.getFullYear(), now.getMonth(), 1)
      });
    }

    return Array.from(map.values()).sort((a, b) => b.date - a.date);
  }, [trades]);

  const selectedDayTrades = useMemo(() => {
    if (!selectedDay) return [];
    return tradesByDate[selectedDay]?.trades ?? [];
  }, [selectedDay, tradesByDate]);

  const handleMonthChange = (offset) => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const handleMonthSelect = (value) => {
    const [year, month] = value.split('-').map(Number);
    setSelectedMonth(new Date(year, month, 1));
  };

  const selectedDayLabel = selectedDay
    ? new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : 'Select a day to view trades';

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
                      onChange={(e) => setFormData({ ...formData, result: e.target.value })}
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
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
                      placeholder="e.g., 2.5 or -1"
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

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-semibold">Filters</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedPeriod(option.value)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    selectedPeriod === option.value
                      ? 'border-purple-400 bg-purple-500/20 text-white'
                      : 'border-slate-600 text-slate-300 hover:border-purple-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div>
              <label className="block text-sm text-slate-400 mb-2">Search Instruments</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
                placeholder="e.g., NQ"
              />
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
              <span className="text-slate-400">Net P&amp;L</span>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className={`text-3xl font-bold ${metrics.netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {currencyFormatter.format(metrics.netPnL)}
            </div>
            <div className="text-sm text-slate-400 mt-1">Selected period</div>
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

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700">
          <h3 className="text-xl font-semibold mb-4">Daily P&amp;L</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={pnlData}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={(value) => currencyFormatter.format(value)} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #475569' }}
                formatter={(value) => [currencyFormatter.format(value), 'Profit / Loss']}
              />
              <Area type="monotone" dataKey="pnl" stroke="#22c55e" fillOpacity={1} fill="url(#pnlGradient)" />
              <Line type="monotone" dataKey="cumulative" stroke="#e879f9" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700">
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
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-400 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square rounded-lg bg-slate-800/50" />;
              }

              const dateKey = formatDateKey(date);
              const dayData = tradesByDate[dateKey];
              const hasTrades = Boolean(dayData);
              const isPositive = (dayData?.profitLoss || 0) >= 0;

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDay(dateKey)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-transform hover:scale-105 border ${
                    hasTrades
                      ? isPositive
                        ? 'bg-green-500/30 border-green-500/40 text-green-100'
                        : 'bg-red-500/30 border-red-500/40 text-red-100'
                      : 'bg-slate-800/50 border-slate-700 text-slate-300'
                  } ${selectedDay === dateKey ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900' : ''}`}
                >
                  <div className="font-semibold text-base">{date.getDate()}</div>
                  <div className="text-[10px]">
                    {hasTrades ? `${dayData.wins}W/${dayData.losses}L` : '—'}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 bg-slate-900/60 rounded-xl p-4 border border-slate-700">
            <h4 className="text-lg font-semibold mb-2">{selectedDayLabel}</h4>
            {selectedDayTrades.length === 0 ? (
              <p className="text-slate-400 text-sm">No trades on this day.</p>
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
                      <div className="text-sm text-slate-400">Net P&amp;L</div>
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
    </div>
  );
}

export default App;
