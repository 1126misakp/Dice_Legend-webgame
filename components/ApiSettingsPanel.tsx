import React, { useEffect, useState } from 'react';
import { KeyRound, Save, Trash2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ApiCapabilities, ApiKeys, DEFAULT_OPENROUTER_MODEL } from '../utils/apiKeyStore';

interface Props {
  apiKeys: ApiKeys;
  capabilities: ApiCapabilities;
  open: boolean;
  onClose: () => void;
  onSave: (keys: ApiKeys) => void;
  onClear: () => void;
}

const keyFields: Array<{
  id: 'openRouter' | 'runningHub' | 'miniMax';
  label: string;
  hint: string;
}> = [
  { id: 'openRouter', label: 'OpenRouter API Key', hint: '角色文案、立绘提示词、动态提示词' },
  { id: 'runningHub', label: 'RunningHub API Key', hint: '角色立绘与动态化视频' },
  { id: 'miniMax', label: 'MiniMax API Key', hint: '角色语音生成' }
];

const ApiSettingsPanel: React.FC<Props> = ({ apiKeys, capabilities, open, onClose, onSave, onClear }) => {
  const [draft, setDraft] = useState<ApiKeys>(apiKeys);

  useEffect(() => {
    if (open) setDraft(apiKeys);
  }, [apiKeys, open]);

  if (!open) return null;

  const capabilityItems = [
    { label: '文案', enabled: capabilities.openRouter },
    { label: '立绘/动态', enabled: capabilities.runningHub },
    { label: '语音', enabled: capabilities.miniMax }
  ];

  return (
    <div className="fixed inset-0 z-[180] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">API 设置</h2>
              <p className="text-xs text-slate-500">密钥仅保存在本机浏览器，用于调用你自己的第三方额度。</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {capabilityItems.map(item => (
              <div key={item.label} className={`rounded-xl border px-3 py-2 flex items-center gap-2 ${item.enabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                {item.enabled ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                <span className="text-xs font-bold">{item.label}</span>
              </div>
            ))}
          </div>

          {keyFields.map(field => (
            <label key={field.id} className="block">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-700">{field.label}</span>
                <span className="text-[11px] text-slate-400">{field.hint}</span>
              </div>
              <input
                type="password"
                value={draft[field.id]}
                onChange={e => setDraft(prev => ({ ...prev, [field.id]: e.target.value }))}
                placeholder="粘贴你的 API Key"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          ))}

          <label className="block">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-slate-700">OpenRouter 模型</span>
              <span className="text-[11px] text-slate-400">主要用于文案生成</span>
            </div>
            <input
              type="text"
              value={draft.openRouterModel}
              onChange={e => setDraft(prev => ({ ...prev, openRouterModel: e.target.value }))}
              placeholder={DEFAULT_OPENROUTER_MODEL}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 leading-relaxed">
            本地保存适合个人设备。共享电脑请使用后点击“清除密钥”，也不要把密钥截图或提交到仓库。
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => {
              onClear();
              setDraft({ openRouter: '', openRouterModel: DEFAULT_OPENROUTER_MODEL, runningHub: '', miniMax: '' });
            }}
            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 flex items-center gap-2"
          >
            <Trash2 size={16} />
            清除密钥
          </button>
          <button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="ml-auto px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <Save size={16} />
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiSettingsPanel;
