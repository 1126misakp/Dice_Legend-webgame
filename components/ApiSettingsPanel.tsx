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
  id: 'openRouter' | 'runningHub' | 'mimo';
  label: string;
  hint: string;
}> = [
  { id: 'openRouter', label: 'OpenRouter API Key', hint: '角色文案、立绘提示词、动态提示词' },
  { id: 'runningHub', label: 'RunningHub API Key', hint: '角色立绘与动态化视频' },
  { id: 'mimo', label: 'MiMo API Key', hint: '角色语音生成' }
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
    { label: '语音', enabled: capabilities.mimo }
  ];

  return (
    <div className="fixed inset-0 z-[180] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[calc(100vh-1.5rem)] rounded-2xl bg-[#f3ddb1] bg-[url('/ui/parchment-panel.png')] bg-cover bg-center shadow-2xl border border-amber-300/55 overflow-hidden flex flex-col text-[#2b1a10]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-4 md:px-5 py-4 border-b border-amber-900/20 bg-amber-950/10 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-950/12 text-blue-900 flex items-center justify-center shrink-0 border border-blue-900/15">
              <KeyRound size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-[#2b1a10]">API 设置</h2>
              <p className="text-xs text-[#5b3a18] leading-relaxed">密钥仅保存在本机浏览器，用于调用你自己的第三方额度。</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-amber-950/10 flex items-center justify-center text-[#5b3a18] shrink-0" title="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 md:p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {capabilityItems.map(item => (
              <div key={item.label} className={`rounded-xl border px-3 py-2 flex items-center gap-2 min-w-0 ${item.enabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                {item.enabled ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                <span className="text-xs font-bold">{item.label}</span>
                <span className="ml-auto text-[10px] font-bold">{item.enabled ? '已启用' : '缺失'}</span>
              </div>
            ))}
          </div>

          {keyFields.map(field => (
            <label key={field.id} className="block">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-[#3b2410]">{field.label}</span>
                <span className="hidden sm:inline text-[11px] text-[#7c5a2b]">{field.hint}</span>
              </div>
              <div className="sm:hidden text-[11px] text-[#7c5a2b] mb-1">{field.hint}</div>
              <input
                type="password"
                value={draft[field.id]}
                onChange={e => setDraft(prev => ({ ...prev, [field.id]: e.target.value }))}
                placeholder="粘贴你的 API Key"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-amber-900/20 bg-white/70 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-900/10"
              />
            </label>
          ))}

          <label className="block">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-[#3b2410]">OpenRouter 模型</span>
              <span className="text-[11px] text-[#7c5a2b]">主要用于文案生成</span>
            </div>
            <input
              type="text"
              value={draft.openRouterModel}
              onChange={e => setDraft(prev => ({ ...prev, openRouterModel: e.target.value }))}
              placeholder={DEFAULT_OPENROUTER_MODEL}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-amber-900/20 bg-white/70 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-900/10"
            />
          </label>

          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 leading-relaxed">
            本地保存适合个人设备。共享电脑请使用后点击“清除密钥”，也不要把密钥截图或提交到仓库。
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 px-4 md:px-5 py-4 border-t border-amber-900/20 bg-amber-950/10 shrink-0">
          <button
            onClick={() => {
              onClear();
              setDraft({ openRouter: '', openRouterModel: DEFAULT_OPENROUTER_MODEL, runningHub: '', mimo: '' });
            }}
            className="px-4 py-2.5 rounded-xl bg-[#1b2d4f]/12 text-[#34405c] font-bold hover:bg-[#1b2d4f]/20 flex items-center justify-center gap-2 border border-[#1b2d4f]/15"
          >
            <Trash2 size={16} />
            清除密钥
          </button>
          <button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="sm:ml-auto px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#2f5b9a] to-[#0b1a39] text-amber-50 font-bold hover:brightness-110 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 border border-amber-200/30"
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
