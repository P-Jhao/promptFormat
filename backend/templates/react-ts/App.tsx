// @ts-nocheck
import { Upload, Sparkles } from "lucide-react";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-xl space-y-8 text-center">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
            <Sparkles size={32} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            开始你的创作
          </h1>
          <p className="text-lg text-gray-600">
            在聊天框输入你的想法，让创意落地。
          </p>
        </div>

        {/* Action Card */}
        {/* <div className="overflow-hidden rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-900/5">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="rounded-full bg-blue-50 p-4">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                上传参考图或文档
              </h3>
              <p className="text-sm text-gray-500">
                支持拖拽上传，或点击下方按钮选择文件
              </p>
            </div>
            <button className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:scale-95">
              选择文件
            </button>
          </div>
        </div> */}

        <p className="text-sm text-gray-400">Built with PromptForge</p>
      </div>
    </div>
  );
}
