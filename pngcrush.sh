#!/bin/bash

cd img/preview
mkdir min

for IMG in *.png
do
curl -X POST -s --form "input=@$IMG;type=image/png" http://pngcrush.com/crush > min/$IMG
done
