#!env python3

import argparse
import os
import re

BASE_DIR = 'node_modules/three/src/renderers/shaders'
SHADER_LIB = os.path.join(BASE_DIR, 'ShaderLib')
SHADER_CHUNK = os.path.join(BASE_DIR, 'ShaderChunk')

RE_SHADER_FILE = re.compile(r"(.*?)_frag\.glsl\.js")
RE_INCLUDE = re.compile(r"(\s*)#include <(.*?)>")

parser = argparse.ArgumentParser(description='Print three.js shader.')
parser.add_argument('shader', default=None, nargs='?')

def print_shader(fname):
    with open(fname) as fh:
        for line in fh:
            m = RE_INCLUDE.match(line)
            if m:
                indent = m.group(1)
                chunkpath = os.path.join(SHADER_CHUNK, f"{m.group(2)}.glsl.js")
                with open(chunkpath) as cfh:
                    for cline in cfh:
                        print(f'{indent}{cline}', end='')
                # print(f'{m.group(1)} {m.group(2)}')
            else:
                print(line, end='')

args = parser.parse_args()
if args.shader:
    frag = os.path.join(SHADER_LIB, f"{args.shader}_frag.glsl.js")
    vert = os.path.join(SHADER_LIB, f"{args.shader}_vert.glsl.js")
    print("Vertex shader")
    print("-------------")
    print_shader(vert)
    print("Fragment shader")
    print("---------------")
    print_shader(frag)
else:
    print("Shaders:")
    shaders = [m.group(1) for m in [RE_SHADER_FILE.match(f) for f in os.listdir(SHADER_LIB)] if m]
    for sh in sorted(shaders):
        print("*", sh)
