import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Filter, TrendingUp, Clock, Target } from 'lucide-react';

function App() {
  // Load trades from localStorage on initial render
  const [trades, setTrades] = useState(() => {
    const savedTrades = localStorage.getItem('tradingJournalTrades');
    return savedTrades ? JSON.parse(savedTrades) : [];
  });
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    side: 'long',
    instrument: 'NQ!',
    result: 'win',
    riskReward: ''
  });
  const [filters, setFilters] = useState({
    timeRange: 'all',
    dayOfWeek: 'all',
    instrument: 'all'
  });

  // Save trades to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tradingJournalTrades', JSON.stringify(trades));
  }, [trades]);

  const getTimeRange = (time) => {
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
    return days[new Date(dateStr).getDay()];
  };

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      const timeRange = getTimeRange(trade.time);
      const dayOfWeek = getDayOfWeek(trade.date);
      
      if (filters.timeRange !== 'all' && timeRange !== filters.timeRange) return false;
      if (filters.dayOfWeek !== 'all' && dayOfWeek !== filters.dayOfWeek) return false;
      if (filters.instrument !== 'all' && trade.instrument !== filters.instrument) return false;
      
      return true;
    });
  }, [trades, filters]);

  const metrics = useMemo(() => {
    const wins = filteredTrades.filter(t => t.result === 'win').length;
    const losses = filteredTrades.filter(t => t.result === 'loss').length;
    const total = filteredTrades.length;
    
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : 0;
    
    const totalWinRR = filteredTrades
      .filter(t => t.result === 'win')
      .reduce((sum, t) => sum + t.riskReward, 0);
    
    const totalLossRR = Math.abs(filteredTrades
      .filter(t => t.result === 'loss')
      .reduce((sum, t) => sum + t.riskReward, 0));
    
    const profitFactor = totalLossRR > 0 ? (totalWinRR / totalLossRR).toFixed(2) : totalWinRR > 0 ? '∞' : 0;
    
    const avgRR = total > 0 
      ? (filteredTrades.reduce((sum, t) => sum + t.riskReward, 0) / total).toFixed(2)
      : 0;

    return { winRate, wins, losses, total, profitFactor, avgRR };
  }, [filteredTrades]);

  const timeRangeData = useMemo(() => {
    const ranges = ['9:30-9:45', '9:45-10:00', '10:00-10:15', '10:15-10:30', '10:30+'];
    return ranges.map(range => {
      const rangeTrades = trades.filter(t => getTimeRange(t.time) === range);
      const wins = rangeTrades.filter(t => t.result === 'win').length;
      const total = rangeTrades.length;
      return {
        range,
        winRate: total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0,
        trades: total
      };
    });
  }, [trades]);

  const dayData = useMemo(() => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return days.map(day => {
      const dayTrades = trades.filter(t => getDayOfWeek(t.date) === day);
      const wins = dayTrades.filter(t => t.result === 'win').length;
      const total = dayTrades.length;
      return {
        day,
        winRate: total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0,
        trades: total
      };
    });
  }, [trades]);

  const instrumentData = useMemo(() => {
    const instruments = ['NQ!', 'ES1!'];
    return instruments.map(instrument => {
      const instTrades = trades.filter(t => t.instrument === instrument);
      const wins = instTrades.filter(t => t.result === 'win').length;
      const total = instTrades.length;
      return {
        instrument,
        wins,
        losses: total - wins,
        winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : 0
      };
    });
  }, [trades]);

  const calendarData = useMemo(() => {
    const grouped = {};
    trades.forEach(trade => {
      if (!grouped[trade.date]) {
        grouped[trade.date] = { wins: 0, losses: 0 };
      }
      if (trade.result === 'win') {
        grouped[trade.date].wins++;
      } else {
        grouped[trade.date].losses++;
      }
    });
    return grouped;
  }, [trades]);

  const handleAddTrade = () => {
    if (!formData.date || !formData.time || !formData.riskReward) {
      alert('Please fill in all fields');
      return;
    }

    const newTrade = {
      id: Date.now(),
      date: formData.date,
      time: formData.time,
      side: formData.side,
      instrument: formData.instrument,
      result: formData.result,
      riskReward: parseFloat(formData.riskReward)
    };

    if (editingTrade) {
      setTrades(trades.map(t => t.id === editingTrade.id ? { ...newTrade, id: editingTrade.id } : t));
      setEditingTrade(null);
    } else {
      setTrades([...trades, newTrade]);
    }

    setFormData({
      date: '',
      time: '',
      side: 'long',
      instrument: 'NQ!',
      result: 'win',
      riskReward: ''
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
      riskReward: trade.riskReward.toString()
    });
    setShowAddForm(true);
  };

  const handleDeleteTrade = (id) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      setTrades(trades.filter(t => t.id !== id));
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
      riskReward: ''
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
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

        {/* Add/Edit Trade Form */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700">
              <h3 className="text-2xl font-bold mb-4">
                {editingTrade ? 'Edit Trade' : 'Add New Trade'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Side</label>
                    <select
                      value={formData.side}
                      onChange={(e) => setFormData({...formData, side: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, instrument: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, result: e.target.value})}
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
                    >
                      <option value="win">Win</option>
                      <option value="loss">Loss</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Risk Reward</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.riskReward}
                      onChange={(e) => setFormData({...formData, riskReward: e.target.value})}
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
                      placeholder="e.g., 2.5 or -1"
                    />
                  </div>
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

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Time Range</label>
              <select 
                value={filters.timeRange}
                onChange={(e) => setFilters({...filters, timeRange: e.target.value})}
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
                onChange={(e) => setFilters({...filters, dayOfWeek: e.target.value})}
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
                onChange={(e) => setFilters({...filters, instrument: e.target.value})}
                className="w-full bg-slate-700 rounded-lg px-4 py-2 border border-slate-600 focus:border-purple-400 focus:outline-none"
              >
                <option value="all">All Instruments</option>
                <option value="NQ!">NQ!</option>
                <option value="ES1!">ES1!</option>
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-6 border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Win Rate</span>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-green-400">{metrics.winRate}%</div>
            <div className="text-sm text-slate-400 mt-1">{metrics.wins}W / {metrics.losses}L</div>
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
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Performance by Time Range */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-semibold mb-4">Win Rate by Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timeRangeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="range" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  formatter={(value, name) => [value + '%', 'Win Rate']}
                />
                <Bar dataKey="winRate" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance by Day */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-semibold mb-4">Win Rate by Day</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  formatter={(value, name) => [value + '%', 'Win Rate']}
                />
                <Bar dataKey="winRate" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Calendar Heatmap */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-purple-400" />
            <h3 className="text-xl font-semibold">Trading Calendar</h3>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Object.entries(calendarData).map(([date, data]) => {
              const isWinningDay = data.wins > data.losses;
              const intensity = Math.min(Math.max(data.wins + data.losses, 1), 5);
              return (
                <div
                  key={date}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs cursor-pointer transition-transform hover:scale-110 ${
                    isWinningDay 
                      ? `bg-green-500/${intensity * 20}` 
                      : `bg-red-500/${intensity * 20}`
                  } border ${isWinningDay ? 'border-green-500/30' : 'border-red-500/30'}`}
                  title={`${date}: ${data.wins}W / ${data.losses}L`}
                >
                  <div className="font-semibold">{new Date(date).getDate()}</div>
                  <div className="text-[10px] text-slate-400">{data.wins}W</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Instrument Performance */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700">
          <h3 className="text-xl font-semibold mb-4">Performance by Instrument</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {instrumentData.map(inst => (
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
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Log */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold mb-4">Trade Log</h3>
          {filteredTrades.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg mb-4">No trades recorded yet</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 inline-flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                Add Your First Trade
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
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map(trade => (
                    <tr key={trade.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4">{trade.date}</td>
                      <td className="py-3 px-4">{trade.time}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          trade.side === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{trade.instrument}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          trade.result === 'win' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.result === 'win' ? '✓ WIN' : '✗ LOSS'}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${
                        trade.riskReward > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.riskReward > 0 ? '+' : ''}{trade.riskReward}R
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
