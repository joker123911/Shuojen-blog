import React, { useState, useEffect } from 'react';
import { Utensils, Plus, Tag, MapPin, X, Trash2, Edit2, Check, Shuffle, Download, Upload, Database } from 'lucide-react';

const FoodDecisionApp = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    distance: '',
    foodType: '',
    customTags: ''
  });

  const [gameMode, setGameMode] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(null);
  const [excludedTags, setExcludedTags] = useState([]);
  const [availablePool, setAvailablePool] = useState([]);
  const [showImportExport, setShowImportExport] = useState(false);

  // 從 localStorage 載入數據
  useEffect(() => {
    const saved = localStorage.getItem('foodDecisionRestaurants');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRestaurants(parsed);
      } catch (e) {
        console.error('載入資料失敗:', e);
      }
    }
  }, []);

  // 自動保存到 localStorage
  useEffect(() => {
    localStorage.setItem('foodDecisionRestaurants', JSON.stringify(restaurants));
  }, [restaurants]);

  const getAllTags = (restaurant) => {
    const tags = [];
    if (restaurant.distance) tags.push(restaurant.distance);
    if (restaurant.foodType) tags.push(restaurant.foodType);
    if (restaurant.customTags) {
      tags.push(...restaurant.customTags.split(',').map(t => t.trim()).filter(t => t));
    }
    return tags;
  };

  const addOrUpdateRestaurant = () => {
    if (!newRestaurant.name.trim()) return;

    if (editingId) {
      setRestaurants(restaurants.map(r =>
        r.id === editingId ? { ...newRestaurant, id: editingId } : r
      ));
      setEditingId(null);
    } else {
      setRestaurants([...restaurants, { ...newRestaurant, id: Date.now() }]);
    }

    setNewRestaurant({ name: '', distance: '', foodType: '', customTags: '' });
    setShowAddForm(false);
  };

  const deleteRestaurant = (id) => {
    if (confirm('確定要刪除這家店嗎？')) {
      setRestaurants(restaurants.filter(r => r.id !== id));
    }
  };

  const startEditing = (restaurant) => {
    setNewRestaurant(restaurant);
    setEditingId(restaurant.id);
    setShowAddForm(true);
  };

  const startGame = () => {
    if (restaurants.length === 0) return;
    setGameMode(true);
    setExcludedTags([]);
    setAvailablePool(restaurants);
    pickRandom(restaurants);
  };

  const pickRandom = (pool) => {
    if (pool.length === 0) {
      setCurrentSuggestion(null);
      return;
    }
    const random = pool[Math.floor(Math.random() * pool.length)];
    setCurrentSuggestion(random);
  };

  const handleReject = (tag) => {
    const newExcludedTags = [...excludedTags, tag];
    setExcludedTags(newExcludedTags);

    const newPool = restaurants.filter(r => {
      const tags = getAllTags(r);
      return !newExcludedTags.some(excluded => tags.includes(excluded));
    });

    setAvailablePool(newPool);
    pickRandom(newPool);
  };

  const handleAccept = () => {
    alert(`決定了！就吃 ${currentSuggestion.name} 吧！🎉`);
    setGameMode(false);
    setCurrentSuggestion(null);
    setExcludedTags([]);
  };

  const reroll = () => {
    pickRandom(availablePool);
  };

  const resetGame = () => {
    setGameMode(false);
    setCurrentSuggestion(null);
    setExcludedTags([]);
    setAvailablePool([]);
  };

  // 匯出為 JSON 檔案
  const exportData = () => {
    const dataStr = JSON.stringify(restaurants, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `restaurants_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 匯入 JSON 檔案
  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          if (confirm(`要匯入 ${imported.length} 家店家嗎？這會覆蓋現有資料。`)) {
            setRestaurants(imported);
            alert('匯入成功！');
          }
        } else {
          alert('檔案格式錯誤！');
        }
      } catch (error) {
        alert('匯入失敗：檔案格式錯誤');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // 清空所有資料
  const clearAllData = () => {
    if (confirm('確定要清空所有店家資料嗎？此操作無法復原！')) {
      if (confirm('真的確定嗎？資料將永久刪除！')) {
        setRestaurants([]);
        localStorage.removeItem('foodDecisionRestaurants');
        alert('已清空所有資料');
      }
    }
  };

  // 批次新增（用文字格式）
  const [batchInput, setBatchInput] = useState('');
  const [showBatchAdd, setShowBatchAdd] = useState(false);

  const batchAddRestaurants = () => {
    const lines = batchInput.trim().split('\n').filter(line => line.trim());
    const newRestaurants = [];

    lines.forEach(line => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 1) {
        newRestaurants.push({
          id: Date.now() + Math.random(),
          name: parts[0] || '',
          distance: parts[1] || '',
          foodType: parts[2] || '',
          customTags: parts[3] || ''
        });
      }
    });

    if (newRestaurants.length > 0) {
      setRestaurants([...restaurants, ...newRestaurants]);
      setBatchInput('');
      setShowBatchAdd(false);
      alert(`成功新增 ${newRestaurants.length} 家店家！`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-orange-50 to-yellow-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Utensils className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl font-bold text-gray-800">吃什麼決策器</h1>
          </div>
          {!gameMode && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportExport(!showImportExport)}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
              >
                <Database className="w-5 h-5" />
                資料管理
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
              >
                <Plus className="w-5 h-5" />
                新增店家
              </button>
            </div>
          )}
        </div>

        {/* 資料管理面板 */}
        {showImportExport && !gameMode && (
          <div className="bg-blue-50 p-6 rounded-lg mb-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Database className="w-5 h-5" />
              資料管理
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={exportData}
                className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition"
              >
                <Download className="w-5 h-5" />
                匯出資料（JSON）
              </button>

              <label className="flex items-center justify-center gap-2 bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition cursor-pointer">
                <Upload className="w-5 h-5" />
                匯入資料（JSON）
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setShowBatchAdd(!showBatchAdd)}
                className="flex items-center justify-center gap-2 bg-indigo-500 text-white px-4 py-3 rounded-lg hover:bg-indigo-600 transition"
              >
                <Plus className="w-5 h-5" />
                批次新增
              </button>

              <button
                onClick={clearAllData}
                className="flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition"
              >
                <Trash2 className="w-5 h-5" />
                清空所有資料
              </button>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600">
                📊 目前共有 <span className="font-bold text-blue-600">{restaurants.length}</span> 家店家
              </p>
              <p className="text-xs text-gray-500 mt-2">
                💡 提示：資料會自動儲存在瀏覽器中，建議定期匯出備份
              </p>
            </div>

            <button
              onClick={() => setShowImportExport(false)}
              className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
            >
              關閉
            </button>
          </div>
        )}

        {/* 批次新增面板 */}
        {showBatchAdd && !gameMode && (
          <div className="bg-indigo-50 p-6 rounded-lg mb-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">批次新增店家</h3>
            <p className="text-sm text-gray-600">
              每行一家店，格式：<code className="bg-gray-200 px-2 py-1 rounded">店名 | 距離 | 食物類型 | 其他標籤</code>
            </p>
            <p className="text-xs text-gray-500">
              範例：<br/>
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">麥當勞 | 近 | 速食 | 便宜,快速</code><br/>
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">一蘭拉麵 | 遠 | 日式 | 好吃,排隊</code>
            </p>
            <textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="麥當勞 | 近 | 速食 | 便宜,快速
一蘭拉麵 | 遠 | 日式 | 好吃,排隊
鼎泰豐 | 中 | 中式 | 貴,排隊,小籠包"
              className="w-full h-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={batchAddRestaurants}
                className="flex-1 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition"
              >
                批次新增
              </button>
              <button
                onClick={() => {
                  setShowBatchAdd(false);
                  setBatchInput('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 遊戲模式 */}
        {gameMode ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-100 to-yellow-100 p-6 rounded-lg">
              {currentSuggestion ? (
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-bold text-gray-800">推薦給你：</h2>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-3xl font-bold text-orange-600 mb-4">
                      {currentSuggestion.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {getAllTags(currentSuggestion).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center flex-wrap">
                    <button
                      onClick={handleAccept}
                      className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition font-semibold"
                    >
                      <Check className="w-5 h-5" />
                      就吃這個！
                    </button>
                    <button
                      onClick={reroll}
                      className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
                    >
                      <Shuffle className="w-5 h-5" />
                      換一個
                    </button>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <p className="text-gray-600 mb-3 font-medium">不想吃的原因是？點擊標籤排除：</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {getAllTags(currentSuggestion).map((tag, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleReject(tag)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                        >
                          {tag} ✕
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-xl text-gray-600">😢 根據你的條件，沒有符合的店家了</p>
                  <button
                    onClick={resetGame}
                    className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600"
