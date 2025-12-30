import React, { useState, useEffect } from 'react';
import { Utensils, Plus, Tag, MapPin, X, Trash2, Edit2, Check, Shuffle } from 'lucide-react';
// 匯入你的本地資料
import initialData from '@site/src/data/restaurants.json';

const FoodDecisionApp = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newRestaurant, setNewRestaurant] = useState({
    name: '', distance: '', foodType: '', customTags: ''
  });

  const [gameMode, setGameMode] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(null);
  const [excludedTags, setExcludedTags] = useState([]);
  const [availablePool, setAvailablePool] = useState([]);

  // 初始化資料：優先檢查 localStorage，若無則用 JSON 資料
  useEffect(() => {
    const saved = localStorage.getItem('restaurants_data');
    if (saved && JSON.parse(saved).length > 0) {
      setRestaurants(JSON.parse(saved));
    } else {
      setRestaurants(initialData);
    }
  }, []);

  // 當資料變動時存入 localStorage
  useEffect(() => {
    if (restaurants.length > 0) {
      localStorage.setItem('restaurants_data', JSON.stringify(restaurants));
    }
  }, [restaurants]);

  // 重置功能：回到 JSON 的初始狀態
  const resetToDefault = () => {
    if (window.confirm('確定要重置回預設店家名單嗎？這會清除你手動新增的店家。')) {
      setRestaurants(initialData);
      localStorage.removeItem('restaurants_data');
    }
  };

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
    setRestaurants(restaurants.filter(r => r.id !== id));
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

  const reroll = () => pickRandom(availablePool);

  const resetGame = () => {
    setGameMode(false);
    setCurrentSuggestion(null);
    setExcludedTags([]);
    setAvailablePool([]);
  };

  return (
    <div className="food-decision-container py-8">
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-8 border border-gray-100">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Utensils className="w-8 h-8 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-800">吃什麼決策器</h1>
          </div>
          {!gameMode && (
            <div className="flex gap-2">
              <button
                onClick={resetToDefault}
                className="text-xs text-gray-400 hover:text-gray-600 underline px-2"
              >
                重置名單
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

        {gameMode ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-lg border border-orange-100">
              {currentSuggestion ? (
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-bold text-gray-700">推薦給你：</h2>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-orange-200">
                    <h3 className="text-3xl font-bold text-orange-600 mb-4">
                      {currentSuggestion.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {getAllTags(currentSuggestion).map((tag, idx) => (
                        <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center flex-wrap pt-4">
                    <button onClick={handleAccept} className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-semibold shadow-md">
                      <Check className="w-5 h-5" /> 就吃這個！
                    </button>
                    <button onClick={reroll} className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 shadow-md">
                      <Shuffle className="w-5 h-5" /> 換一個
                    </button>
                  </div>

                  <div className="border-t border-orange-200 pt-4 mt-6">
                    <p className="text-sm text-gray-500 mb-3">不滿意？點擊下方標籤排除該類別：</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {getAllTags(currentSuggestion).map((tag, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleReject(tag)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition text-sm"
                        >
                          排除 {tag} ✕
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-lg text-gray-600">😢 沒選項了，放寬標籤限制試試看？</p>
                  <button onClick={resetGame} className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-lg">重新開始</button>
                </div>
              )}
            </div>
            <button onClick={resetGame} className="w-full text-gray-500 py-2 hover:underline">返回列表</button>
          </div>
        ) : (
          <>
            {showAddForm && (
              <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200 space-y-4">
                <h3 className="font-bold text-gray-800">{editingId ? '編輯店家資訊' : '新增口袋名單'}</h3>
                <input
                  type="text"
                  placeholder="店家名稱"
                  value={newRestaurant.name}
                  onChange={(e) => setNewRestaurant({...newRestaurant, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="距離"
                    value={newRestaurant.distance}
                    onChange={(e) => setNewRestaurant({...newRestaurant, distance: e.target.value})}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="類型 (如: 日式)"
                    value={newRestaurant.foodType}
                    onChange={(e) => setNewRestaurant({...newRestaurant, foodType: e.target.value})}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder="自定義標籤 (逗號分隔)"
                  value={newRestaurant.customTags}
                  onChange={(e) => setNewRestaurant({...newRestaurant, customTags: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <div className="flex gap-2">
                  <button onClick={addOrUpdateRestaurant} className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 font-bold">
                    {editingId ? '儲存修改' : '加入名單'}
                  </button>
                  <button onClick={() => {setShowAddForm(false); setEditingId(null);}} className="px-6 py-2 bg-gray-200 rounded-lg">取消</button>
                </div>
              </div>
            )}

            <div className="grid gap-3 mb-8">
              {restaurants.map(restaurant => (
                <div key={restaurant.id} className="group bg-white border border-gray-100 p-4 rounded-xl hover:border-orange-200 hover:shadow-sm transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gray-800">{restaurant.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {restaurant.distance && <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"><MapPin className="w-3 h-3"/>{restaurant.distance}</span>}
                        {restaurant.foodType && <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs"><Utensils className="w-3 h-3"/>{restaurant.foodType}</span>}
                        {restaurant.customTags && restaurant.customTags.split(',').map((tag, i) => (
                          <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs"><Tag className="w-3 h-3"/>{tag.trim()}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => startEditing(restaurant)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                      <button onClick={() => deleteRestaurant(restaurant.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={startGame} className="w-full bg-orange-500 text-white py-4 rounded-xl hover:bg-orange-600 font-bold text-xl shadow-lg transition transform hover:-translate-y-1">
              🎲 開始決定吃什麼！
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FoodDecisionApp;