import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { FileDown, Upload, AlertTriangle, CheckCircle, Loader2, RefreshCw, Send } from 'lucide-react';
import { decodeFile, parseStockCSV, convertToInventoryUpdate, validateCSVFile } from '../services/csvParser';
import { fetchProductsFromSheets } from '../services/dataService';
import { writeUnregisteredProducts } from '../services/googleSheets';

interface UnmatchedProduct {
  sku: string;
  productName: string;
}

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
  const [unmatchedProducts, setUnmatchedProducts] = useState<UnmatchedProduct[]>([]);
  const [writeStatus, setWriteStatus] = useState<'idle' | 'writing' | 'done' | 'error'>('idle');
  const [writeMessage, setWriteMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const validation = validateCSVFile(file);
    if (!validation.valid) {
      setStatus('error');
      setMessage(validation.error || '無効なファイル');
      return;
    }

    setStatus('processing');
    setMessage('ファイルを解析中...');

    try {
      const csvText = await decodeFile(file);
      const csvRows = parseStockCSV(csvText);
      const inventoryUpdates = convertToInventoryUpdate(csvRows);

      setMessage(`${inventoryUpdates.length} 件の在庫データを取得。Google Sheets と照合中...`);
      const sheetsProducts = await fetchProductsFromSheets();

      const productMap = new Map<string, Product>();
      sheetsProducts.forEach(p => productMap.set(p.sku, p));

      let matchedCount = 0;
      let unmatchedCount = 0;

      const updatedProducts = sheetsProducts.map(product => {
        const update = inventoryUpdates.find(u => u.sku === product.sku);
        if (update) {
          matchedCount++;
          return { ...product, stock: update.stock, price: update.price || product.price };
        }
        return product;
      });

      const unmatchedList: UnmatchedProduct[] = [];
      inventoryUpdates.forEach(u => {
        if (!productMap.has(u.sku)) {
          unmatchedCount++;
          unmatchedList.push({ sku: u.sku, productName: u.productName });
        }
      });
      setUnmatchedProducts(unmatchedList);
      setWriteStatus('idle');
      setWriteMessage('');

      onUpdateInventory(updatedProducts);

      setUploadDetails({ matched: matchedCount, unmatched: unmatchedCount, total: inventoryUpdates.length });
      setStatus('success');
      setMessage('在庫更新完了');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'ファイル処理中にエラーが発生しました');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
  };

  const handleWriteUnregistered = async () => {
    if (unmatchedProducts.length === 0) return;
    setWriteStatus('writing');
    setWriteMessage('Product_Master に書き込み中...');
    try {
      const result = await writeUnregisteredProducts(unmatchedProducts);
      setWriteStatus('done');
      setWriteMessage(result.message);
    } catch (err) {
      setWriteStatus('error');
      setWriteMessage(err instanceof Error ? err.message : '書き込みに失敗しました');
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setStatus('processing');
    setMessage('Google Sheets からデータを再読み込み中...');
    try {
      await onRefresh();
      setStatus('success');
      setMessage('データを更新しました');
      setUploadDetails(null);
    } catch (err) {
      setStatus('error');
      setMessage('再読み込みに失敗しました');
    }
  };

  const downloadTemplate = () => {
    const bom = '\uFEFF';
    const header = '倉庫コード,倉庫名,商品コード,商品名,標準価格,現在在庫数,入庫予定数,出庫予定数,予定在庫数,販売予定,安全在庫数,仕様・規格,在庫基準\n';
    const example = 'WH000-A,メイン倉庫,A170JR-AB180,A170JR-AB180　シューズ,8200,100,0,0,100,100,,バーコード,\n';
    const blob = new Blob([bom + header + example], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock_template.csv';
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-5 md:py-6">
      <h2 className="page-title md:page-title-desk mb-1">在庫データ更新</h2>
      <p className="text-sm text-stone-500 mb-5">最新の在庫 CSV ファイルをアップロードしてください</p>

      {/* Stats */}
      <div className="vi-card p-4 md:p-5 mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">現在の登録商品数</div>
          <div className="text-3xl font-extrabold text-stone-900 mono">{currentCount}</div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={status === 'processing'}
          className="btn btn-secondary"
        >
          <RefreshCw size={16} className={status === 'processing' ? 'animate-spin' : ''} />
          再読み込み
        </button>
      </div>

      {/* Upload zone */}
      <div
        className={`vi-card p-6 md:p-10 text-center transition-colors cursor-pointer ${
          isDragging ? 'border-stone-900 bg-stone-50' : 'hover:bg-stone-50 hover:border-stone-300'
        } ${status === 'processing' ? 'opacity-60 pointer-events-none' : ''}`}
        style={{ borderStyle: 'dashed', borderWidth: '2px' }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileSelect} />

        {status === 'processing' ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="animate-spin text-stone-700" size={40} />
            <p className="text-stone-700 font-semibold">{message}</p>
          </div>
        ) : status === 'success' ? (
          <div className="text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle className="text-emerald-700" size={36} />
              <p className="text-emerald-700 font-extrabold text-lg">{message}</p>
            </div>

            {uploadDetails && (
              <div className="grid grid-cols-3 gap-3 mb-5 text-center">
                <div className="vi-card p-3">
                  <div className="text-2xl font-extrabold text-emerald-700 mono">{uploadDetails.matched}</div>
                  <div className="text-xs font-bold text-stone-500 mt-1">マッチ</div>
                </div>
                <div className="vi-card p-3">
                  <div className="text-2xl font-extrabold text-orange-600 mono">{uploadDetails.unmatched}</div>
                  <div className="text-xs font-bold text-stone-500 mt-1">未登録</div>
                </div>
                <div className="vi-card p-3">
                  <div className="text-2xl font-extrabold text-stone-700 mono">{uploadDetails.total}</div>
                  <div className="text-xs font-bold text-stone-500 mt-1">合計</div>
                </div>
              </div>
            )}

            {/* Unmatched list */}
            {unmatchedProducts.length > 0 && (
              <div className="vi-card overflow-hidden border-orange-200">
                <div className="bg-orange-50 px-4 py-3 flex items-center justify-between border-b border-orange-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-orange-600" />
                    <span className="text-sm font-bold text-orange-900">未登録 SKU {unmatchedProducts.length} 件</span>
                  </div>
                  {writeStatus === 'done' ? (
                    <span className="text-xs text-emerald-700 font-bold">書き込み完了</span>
                  ) : (
                    <button
                      onClick={handleWriteUnregistered}
                      disabled={writeStatus === 'writing'}
                      className="btn btn-primary text-sm"
                      style={{ minHeight: '36px', padding: '8px 14px' }}
                    >
                      {writeStatus === 'writing' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {writeStatus === 'writing' ? '書き込み中...' : 'Product_Master に追加'}
                    </button>
                  )}
                </div>

                {writeMessage && (
                  <div className={`px-4 py-2 text-xs font-semibold ${writeStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {writeMessage}
                  </div>
                )}

                <div className="max-h-56 overflow-y-auto divide-y divide-stone-100">
                  {unmatchedProducts.map((p, i) => (
                    <div key={i} className="px-4 py-2 text-sm flex gap-3 items-baseline">
                      <span className="mono text-stone-500 font-bold flex-shrink-0">{p.sku}</span>
                      <span className="text-stone-700 truncate">{p.productName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => { setStatus('idle'); setUploadDetails(null); setUnmatchedProducts([]); setWriteStatus('idle'); }}
              className="mt-5 text-sm font-semibold text-stone-700 hover:text-stone-900 underline"
            >
              続けてアップロード
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <Upload className="text-stone-500 mb-2" size={36} strokeWidth={1.5} />
            <p className="text-stone-900 font-bold text-lg">CSV ファイルをドラッグ</p>
            <p className="text-stone-500 text-sm">またはタップして選択</p>
            <p className="text-xs text-stone-400 mt-3 mono">Shift-JIS / UTF-8 CSV 対応</p>
          </div>
        )}
      </div>

      {status === 'error' && (
        <div className="alert-error mt-4 flex items-start gap-2.5">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {/* Help section */}
      <div className="mt-7">
        <div className="alert-info mb-4">
          <div className="font-extrabold mb-1">CSV フォーマット（在庫システム形式）</div>
          <p className="text-sm font-medium">必須列：商品コード / 現在在庫数 / 標準価格</p>
          <p className="text-xs mt-1 opacity-80">Shift-JIS エンコーディング対応</p>
        </div>

        <button onClick={downloadTemplate} className="btn btn-secondary w-full">
          <FileDown size={18} />
          CSV テンプレートをダウンロード
        </button>
      </div>
    </div>
  );
};
