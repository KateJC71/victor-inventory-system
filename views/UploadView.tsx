
import React, { useState, useRef } from 'react';
import { Product, CategoryType } from '../types';
import { FileDown, Upload, AlertTriangle, CheckCircle, Loader2, RefreshCw, Database } from 'lucide-react';
import { decodeFile, parseStockCSV, convertToInventoryUpdate, validateCSVFile } from '../services/csvParser';
import { fetchProductsFromSheets } from '../services/dataService';

interface UploadViewProps {
  onUpdateInventory: (newProducts: Product[]) => void;
  currentCount: number;
  onRefresh?: () => Promise<void>;
}

export const UploadView: React.FC<UploadViewProps> = ({ onUpdateInventory, currentCount, onRefresh }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [uploadDetails, setUploadDetails] = useState<{ matched: number; unmatched: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    // 驗證檔案
    const validation = validateCSVFile(file);
    if (!validation.valid) {
      setStatus('error');
      setMessage(validation.error || '無効なファイル');
      return;
    }

    setStatus('processing');
    setMessage('ファイルを解析中...');

    try {
      // 解碼檔案 (支援 Shift-JIS)
      const csvText = await decodeFile(file);

      // 解析 CSV
      const csvRows = parseStockCSV(csvText);
      const inventoryUpdates = convertToInventoryUpdate(csvRows);

      setMessage(`${inventoryUpdates.length}件の在庫データを取得。Google Sheetsと照合中...`);

      // 從 Google Sheets 取得最新商品資料
      const sheetsProducts = await fetchProductsFromSheets();

      // 建立 SKU Map
      const productMap = new Map<string, Product>();
      sheetsProducts.forEach(p => productMap.set(p.sku, p));

      // 更新庫存和價格
      let matchedCount = 0;
      let unmatchedCount = 0;

      const updatedProducts = sheetsProducts.map(product => {
        const update = inventoryUpdates.find(u => u.sku === product.sku);
        if (update) {
          matchedCount++;
          return {
            ...product,
            stock: update.stock,
            price: update.price || product.price,
          };
        }
        return product;
      });

      // 計算未匹配的 SKU
      inventoryUpdates.forEach(u => {
        if (!productMap.has(u.sku)) {
          unmatchedCount++;
        }
      });

      // 更新應用程式狀態
      onUpdateInventory(updatedProducts);

      setUploadDetails({
        matched: matchedCount,
        unmatched: unmatchedCount,
        total: inventoryUpdates.length,
      });
      setStatus('success');
      setMessage(`在庫更新完了！`);

    } catch (err) {
      console.error('Upload error:', err);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'ファイル処理中にエラーが発生しました');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setStatus('processing');
      setMessage('Google Sheetsからデータを再読み込み中...');
      try {
        await onRefresh();
        setStatus('success');
        setMessage('データを更新しました');
        setUploadDetails(null);
      } catch (err) {
        setStatus('error');
        setMessage('再読み込みに失敗しました');
      }
    }
  };

  const downloadTemplate = () => {
    const bom = "\uFEFF";
    const header = "倉庫コード,倉庫名,商品コード,商品名,標準価格,現在在庫数,入庫予定数,出庫予定数,予定在庫数,販売予定,安全在庫数,仕様・規格,在庫基準\n";
    const example = 'WH000-A,メイン倉庫,A170JR-AB180,A170JR-AB180　シューズ,8200,100,0,0,100,100,,バーコード,\n';
    const blob = new Blob([bom + header + example], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock_template.csv';
    a.click();
  };

  return (
    <div className="p-4 max-w-3xl mx-auto min-h-[80vh]">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">在庫データ更新</h2>
          <p className="text-gray-500 text-sm mt-1">最新の在庫CSVファイルをアップロードしてください</p>
        </div>

        {/* 現在狀態 */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-blue-800 text-sm font-medium">現在の登録商品数</div>
              <div className="text-2xl font-bold text-blue-900">{currentCount}</div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={status === 'processing'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={16} className={status === 'processing' ? 'animate-spin' : ''} />
              再読み込み
            </button>
          </div>
        </div>

        {/* 上傳區域 */}
        <div
          className={`
            border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
            ${status === 'processing' ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleFileSelect}
          />

          {status === 'processing' ? (
            <div className="flex flex-col items-center py-4">
              <Loader2 className="animate-spin text-blue-600 mb-3" size={48} />
              <p className="text-blue-600 font-medium">{message}</p>
            </div>
          ) : status === 'success' ? (
             <div className="flex flex-col items-center py-4">
              <CheckCircle className="text-green-500 mb-3" size={48} />
              <p className="text-green-600 font-bold text-lg">{message}</p>

              {uploadDetails && (
                <div className="mt-4 text-sm space-y-1">
                  <p className="text-gray-600">
                    <span className="font-medium text-green-600">{uploadDetails.matched}</span> 件マッチ
                    {uploadDetails.unmatched > 0 && (
                      <span className="text-orange-500 ml-2">
                        ({uploadDetails.unmatched} 件未登録SKU)
                      </span>
                    )}
                  </p>
                  <p className="text-gray-400 text-xs">
                    CSVファイル内: {uploadDetails.total} 件
                  </p>
                </div>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); setStatus('idle'); setUploadDetails(null); }}
                className="mt-4 text-blue-600 underline text-sm"
              >
                続けてアップロード
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="bg-blue-100 p-4 rounded-full mb-4">
                <Upload className="text-blue-600" size={32} />
              </div>
              <p className="text-gray-900 font-medium text-lg">クリックしてファイルを選択</p>
              <p className="text-gray-400 text-sm mt-2">またはここにファイルをドロップ</p>
              <p className="text-xs text-gray-400 mt-4">対応: Shift-JIS / UTF-8 CSV</p>
            </div>
          )}
        </div>

        {status === 'error' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 text-sm">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* 說明區域 */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="mb-4 text-left bg-gray-50 p-4 rounded-lg text-sm text-gray-600 space-y-2">
            <div className="flex items-center gap-2 text-gray-800 font-bold mb-2">
              <Database size={16} />
              CSVフォーマット（在庫システム形式）
            </div>
            <p className="text-xs">
              <span className="font-medium">必須列:</span> 商品コード, 現在在庫数, 標準価格
            </p>
            <p className="text-xs text-gray-500">
              ※ Shift-JIS エンコーディングに対応しています
            </p>
          </div>

          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium border border-gray-200"
          >
            <FileDown size={16} />
            CSVテンプレートをダウンロード
          </button>
        </div>
      </div>
    </div>
  );
};
