import sys, os, re, json, requests, ctypes
from urllib.parse import quote
from pathlib import Path
from functools import cmp_to_key

# 判断是否是 Windows 平台
IS_WINDOWS = os.name == "nt"

if IS_WINDOWS:
    # 使用 Windows 的逻辑比较函数，符合 Explorer 的排序方式
    _strcmp = ctypes.windll.shlwapi.StrCmpLogicalW
    _strcmp.argtypes = [ctypes.c_wchar_p, ctypes.c_wchar_p]
    _strcmp.restype = ctypes.c_int

    def _cmp_win_name(a, b, ignore_ext=False):
        a_name = Path(a).name
        b_name = Path(b).name
        if ignore_ext:
            a_base, a_ext = os.path.splitext(a_name)
            b_base, b_ext = os.path.splitext(b_name)
            r = _strcmp(a_base, b_base)
            if r != 0:
                return r
            return _strcmp(a_ext, b_ext)
        else:
            return _strcmp(a_name, b_name)

else:
    # 在 Linux/macOS 上实现一个自然排序（模仿 Windows Explorer 的排序）
    def _alphanum_key(s):
        # 把字符串切割成数字块和非数字块
        # 例如 "file12.txt" -> ["file", 12, ".txt"]
        return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

    def _cmp_win_name(a, b, ignore_ext=False):
        a_name = Path(a).name
        b_name = Path(b).name
        if ignore_ext:
            a_base, a_ext = os.path.splitext(a_name)
            b_base, b_ext = os.path.splitext(b_name)
            ka = (_alphanum_key(a_base), _alphanum_key(a_ext))
            kb = (_alphanum_key(b_base), _alphanum_key(b_ext))
        else:
            ka = _alphanum_key(a_name)
            kb = _alphanum_key(b_name)

        if ka < kb:
            return -1
        elif ka > kb:
            return 1
        return 0


# IPFS 请求
def ipfs_api(endpoint, arg):
    url = f"http://127.0.0.1:5001/api/v0/{endpoint}?arg={arg}"
    resp = requests.post(url)
    resp.raise_for_status()
    return resp.json()

def validate_cid(cid):
    try:
        data = ipfs_api("cid/format", cid)
        return (False, data.get("ErrorMsg")) if data.get("ErrorMsg") else (True, data)
    except Exception as e:
        return False, str(e)

def get_files(cid, path):
    print(path or "/")
    data = ipfs_api("ls", f"{cid}{quote(path)}")
    links = data.get("Objects",[{}])[0].get("Links", [])
    return [(e["Name"], int(e["Size"]), int(e["Type"])) for e in links]

# 列出全部 cid
def list_all(cid, start_path="/"):
    obj = {}

    def dfs(path):
        rel_path = "" if path == "/" else path
        entries, size = [], 0
        for name, tsize, type_ in get_files(cid, rel_path):
            if type_ == 1:  
                tsize = dfs(f"{rel_path}/{name}")
            size += tsize
            entries.append((name, tsize, type_))
        entries.sort(key=cmp_to_key(lambda x, y: x[2]-y[2] if x[2]!=y[2] else _cmp_win_name(x[0], y[0])))
        obj[rel_path or "/"] = [(n, s) for n,s,_ in entries]
        return size

    dfs(start_path)
    return obj

def main():
    if len(sys.argv) < 2:
        print("用法: python cid.py <CID>")
        sys.exit(1)

    cid = sys.argv[1]
    ok, result = validate_cid(cid)
    if not ok:
        print(f"❌ CID 格式错误或无效: {result}")
        sys.exit(1)
    print("✅ CID 格式有效")
    tree = list_all(cid)
    with open("static/data.json", "w", encoding="utf-8") as f:
        json.dump(tree, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    print("数据已导出到 static/data.json")

if __name__ == "__main__":
    main()