import os
import json
import time
import ctypes
import sys
import re
from functools import cmp_to_key
from pathlib import Path

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


def is_symlink(path):
    # 检查路径是否为符号链接
    return os.path.islink(path)

def get_file_info(filepath):
    # 获取单个文件的信息，跳过符号链接
    if is_symlink(filepath):
        return None
    try:
        stat = os.stat(filepath)
        return {
            'name': os.path.basename(filepath),
            'size': stat.st_size,
            'mtime': stat.st_mtime
        }
    except (OSError, FileNotFoundError):
        return None

def get_dir_size(dirpath):
    # 计算目录的总大小（递归），跳过符号链接
    if is_symlink(dirpath):
        return 0
    total_size = 0
    try:
        for dirpath, dirnames, filenames in os.walk(dirpath):
            dirnames[:] = [d for d in dirnames if not is_symlink(os.path.join(dirpath, d))]
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                if not is_symlink(filepath):
                    try:
                        total_size += os.path.getsize(filepath)
                    except (OSError, FileNotFoundError):
                        continue
    except (OSError, FileNotFoundError):
        pass
    return total_size

def scan_directory(root_dir):
    # 扫描目录并生成所需的数据结构，跳过符号链接
    result = {}
    root_dir = os.path.normpath(root_dir)
    try:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            dirnames[:] = [d for d in dirnames if not is_symlink(os.path.join(dirpath, d))]
            rel_path = os.path.relpath(dirpath, root_dir)
            if rel_path == '.':
                rel_path = ''
            full_path = '/' + rel_path.replace('\\', '/')
            file_list = []
            dirs_list = []
            for dirname in dirnames:
                dir_full_path = os.path.join(dirpath, dirname)
                if not is_symlink(dir_full_path):
                    try:
                        dir_size = get_dir_size(dir_full_path)
                        dir_mtime = os.path.getmtime(dir_full_path)
                        dirs_list.append([dirname, dir_size, int(dir_mtime)])
                    except (OSError, FileNotFoundError):
                        continue
            for filename in filenames:
                file_path = os.path.join(dirpath, filename)
                if not is_symlink(file_path):
                    file_info = get_file_info(file_path)
                    if file_info:
                        file_list.append([file_info['name'], file_info['size'], int(file_info['mtime'])])
            file_list.sort(key=cmp_to_key(lambda x, y: _cmp_win_name(x[0], y[0])))
            dirs_list.sort(key=cmp_to_key(lambda x, y: _cmp_win_name(x[0], y[0])))
            if full_path not in result:
                result[full_path] = []
            result[full_path].extend(dirs_list+file_list)
    except (OSError, FileNotFoundError) as e:
        print(f"警告：无法访问目录 {root_dir}: {e}")
    return result

def main():
    root_dir = 'd'  # 要扫描的根目录
    if not os.path.exists(root_dir):
        print(f"错误：目录 '{root_dir}' 不存在")
        return
    print("正在扫描目录，请稍候...")
    data = scan_directory(root_dir)
    with open('static/data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f,separators=(',', ':'),ensure_ascii=False)
    print("数据已导出到 static/data.json")

if __name__ == '__main__':
    main()