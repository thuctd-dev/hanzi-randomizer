export interface DefaultVocabularyItem {
  id: string;
  lesson: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
}

const DEFAULT_VOCAB_TEXT = `
Bài mẫu | 忙 | máng | Bận, bận rộn
Bài mẫu | 很 | hěn | Rất
Bài mẫu | 汉 | hàn | Hán (trong dân tộc Hán, chữ Hán)
Bài mẫu | 语 | yǔ | Ngôn ngữ, tiếng nói
Bài mẫu | 汉语 | hànyǔ | Tiếng Hán, tiếng Trung
Bài mẫu | 难 | nán | Khó
Bài mẫu | 太 | tài | Quá, lắm
Bài mẫu | 他 | tā | Anh ấy, ông ấy, cậu ấy
Bài mẫu | 她 | tā | Cô ấy, chị ấy, bà ấy
Bài mẫu | 男 | nán | Nam giới, đàn ông
Bài mẫu | 爸爸 | bàba | Bố
Bài mẫu | 爷爷 | yéye | Ông nội
Bài mẫu | 妈妈 | māma | Mẹ
Bài mẫu | 奶奶 | nǎinai | Bà nội
Bài mẫu | 姐姐 | jiějie | Chị gái
Bài mẫu | 妹妹 | mèimei | Em gái
Bài mẫu | 哥哥 | gēge | Anh trai
Bài mẫu | 弟弟 | dìdi | Em trai
Bài mẫu | 他是一个好男人 | Tā shì yí ge hǎo nánrén. | Anh ấy là một người đàn ông tốt.
Bài mẫu | 汉语不太难 | Hànyǔ bú tài nán. | Tiếng Hán không khó lắm

Bộ thủ | 一 | yī | Một
Bộ thủ | 丨 | gǔn | Đường thẳng
Bộ thủ | 丶 | zhǔ | Chấm
Bộ thủ | 丿 | piě | Gạch chéo
Bộ thủ | 乙 | yǐ | Con rắn, thứ hai
Bộ thủ | 亅 | jué | Móc
Bộ thủ | 二 | èr | Hai
Bộ thủ | 亠 | tóu | Nắp, đầu
Bộ thủ | 人 | rén | Người
Bộ thủ | 儿 | ér | Con
Bộ thủ | 入 | rù | Vào
Bộ thủ | 八 | bā | Tám
Bộ thủ | 冂 | jiōng | Khung ngoài
Bộ thủ | 冖 | mì | Trùm, che
Bộ thủ | 冫 | bīng | Băng
Bộ thủ | 几 | jī | Bàn nhỏ
Bộ thủ | 凵 | kǎn | Hộp mở
Bộ thủ | 刀 | dāo | Dao
Bộ thủ | 力 | lì | Lực
Bộ thủ | 勹 | bāo | Bao
Bộ thủ | 匕 | bǐ | Thìa
Bộ thủ | 匚 | fāng | Hộp bên phải
Bộ thủ | 匸 | xǐ | Bao che
Bộ thủ | 十 | shí | Mười
Bộ thủ | 卜 | bǔ | Bói
Bộ thủ | 卩 | jié | Dấu niêm
Bộ thủ | 厂 | chǎng | Vách núi
Bộ thủ | 厶 | sī | Riêng tư
Bộ thủ | 又 | yòu | Lại
Bộ thủ | 口 | kǒu | Miệng
Bộ thủ | 囗 | wéi | Vòng ngoài
Bộ thủ | 土 | tǔ | Đất
Bộ thủ | 士 | shì | Học giả
Bộ thủ | 夂 | zhī | Đi
Bộ thủ | 夊 | suī | Đi chậm
Bộ thủ | 夕 | xī | Tối
Bộ thủ | 大 | dà | Lớn
Bộ thủ | 女 | nǚ | Nữ
Bộ thủ | 子 | zǐ | Con cái
Bộ thủ | 宀 | mián | Mái nhà
Bộ thủ | 寸 | cùn | Tấc
Bộ thủ | 小 | xiǎo | Nhỏ
Bộ thủ | 尢 | wāng | Tật chân
Bộ thủ | 尸 | shī | Xác
Bộ thủ | 屮 | chè | Mầm cây
Bộ thủ | 山 | shān | Núi
Bộ thủ | 巛 | chuān | Sông
Bộ thủ | 工 | gōng | Công việc
Bộ thủ | 己 | jǐ | Bản thân
Bộ thủ | 巾 | jīn | Khăn
Bộ thủ | 干 | gān | Khô
Bộ thủ | 幺 | yāo | Nhỏ
Bộ thủ | 广 | yǎn | Mái che
Bộ thủ | 廴 | yǐn | Bước dài
Bộ thủ | 廾 | gǒng | Hai tay
Bộ thủ | 弋 | yì | Bắn
Bộ thủ | 弓 | gōng | Cung
Bộ thủ | 彐 | jì | Mõm
Bộ thủ | 彡 | shān | Lông
Bộ thủ | 彳 | chì | Bước
Bộ thủ | 心 | xīn | Tim
Bộ thủ | 戈 | gē | Giáo
Bộ thủ | 户 | hù | Cửa
Bộ thủ | 手 | shǒu | Tay
Bộ thủ | 支 | zhī | Cành
Bộ thủ | 攴 | pū | Đập
Bộ thủ | 文 | wén | Văn
Bộ thủ | 斗 | dǒu | Đấu
Bộ thủ | 斤 | jīn | Cái rìu
Bộ thủ | 方 | fāng | Hình vuông
Bộ thủ | 无 | wú | Không
Bộ thủ | 日 | rì | Mặt trời
Bộ thủ | 曰 | yuē | Nói
Bộ thủ | 月 | yuè | Mặt trăng
Bộ thủ | 木 | mù | Gỗ
Bộ thủ | 欠 | qiàn | Thiếu
Bộ thủ | 止 | zhǐ | Dừng lại
Bộ thủ | 歹 | dǎi | Chết
Bộ thủ | 殳 | shū | Cây thương
Bộ thủ | 毋 | wú | Đừng
Bộ thủ | 比 | bǐ | So sánh
Bộ thủ | 毛 | máo | Lông
Bộ thủ | 氏 | shì | Họ
Bộ thủ | 气 | qì | Khí
Bộ thủ | 水 | shuǐ | Nước
Bộ thủ | 火 | huǒ | Lửa
Bộ thủ | 爪 | zhǎo | Móng
Bộ thủ | 父 | fù | Cha
Bộ thủ | 爻 | yáo | Giao xảo
Bộ thủ | 爿 | qiáng | Dầm
Bộ thủ | 片 | piàn | Miếng
Bộ thủ | 牙 | yá | Răng
Bộ thủ | 牛 | niú | Bò
Bộ thủ | 犬 | quǎn | Chó
Bộ thủ | 玄 | xuán | Sâu sắc
Bộ thủ | 玉 | yù | Ngọc
Bộ thủ | 瓜 | guā | Dưa
Bộ thủ | 瓦 | wǎ | Ngói
Bộ thủ | 甘 | gān | Ngọt
Bộ thủ | 生 | shēng | Sống
Bộ thủ | 用 | yòng | Dùng
Bộ thủ | 田 | tián | Ruộng
Bộ thủ | 疋 | pǐ | Cuộn vải
Bộ thủ | 疒 | nè | Bệnh
Bộ thủ | 癶 | bō | Chạy
Bộ thủ | 白 | bái | Trắng
Bộ thủ | 皮 | pí | Da
Bộ thủ | 皿 | mǐn | Bát đĩa
Bộ thủ | 目 | mù | Mắt
Bộ thủ | 矛 | máo | Thương
Bộ thủ | 矢 | shǐ | Mũi tên
Bộ thủ | 石 | shí | Đá
Bộ thủ | 示 | shì | Thần
Bộ thủ | 禾 | hé | Lúa
Bộ thủ | 穴 | xué | Hang
Bộ thủ | 立 | lì | Đứng
Bộ thủ | 竹 | zhú | Tre
Bộ thủ | 米 | mǐ | Gạo
Bộ thủ | 糸 | mì | Tơ
Bộ thủ | 缶 | fǒu | Bình
Bộ thủ | 网 | wǎng | Lưới
Bộ thủ | 羊 | yáng | Dê
Bộ thủ | 羽 | yǔ | Lông vũ
Bộ thủ | 老 | lǎo | Già
Bộ thủ | 而 | ér | Mà
Bộ thủ | 耒 | lěi | Cày
Bộ thủ | 耳 | ěr | Tai
Bộ thủ | 聿 | yù | Bút
Bộ thủ | 肉 | ròu | Thịt
Bộ thủ | 自 | zì | Tự thân
Bộ thủ | 至 | zhì | Đến
Bộ thủ | 臼 | jiù | Cối xay
Bộ thủ | 舌 | shé | Lưỡi
Bộ thủ | 舛 | chuǎn | Trái hướng
Bộ thủ | 舟 | zhōu | Thuyền
Bộ thủ | 艮 | gèn | Dừng
Bộ thủ | 色 | sè | Màu
Bộ thủ | 艸 | cǎo | Cỏ
Bộ thủ | 虍 | hū | Vằn hổ
Bộ thủ | 虫 | chóng | Côn trùng
Bộ thủ | 血 | xuè | Máu
Bộ thủ | 行 | xíng | Đi
Bộ thủ | 衣 | yī | Quần áo
Bộ thủ | 襾 | yà | Che phủ
Bộ thủ | 见 | jiàn | Nhìn
Bộ thủ | 角 | jiǎo | Sừng
Bộ thủ | 言 | yán | Lời nói
Bộ thủ | 谷 | gǔ | Thung lũng
Bộ thủ | 豆 | dòu | Đậu
Bộ thủ | 豕 | shǐ | Lợn
Bộ thủ | 豸 | zhì | Thú
Bộ thủ | 貝 | bèi | Vật báu
Bộ thủ | 赤 | chì | Đỏ
Bộ thủ | 走 | zǒu | Chạy
Bộ thủ | 足 | zú | Chân
Bộ thủ | 身 | shēn | Thân thể
Bộ thủ | 車 | chē | Xe
Bộ thủ | 辛 | xīn | Cay đắng
Bộ thủ | 辰 | chén | Sáng sớm
Bộ thủ | 辵 | chuò | Đi chậm
Bộ thủ | 邑 | yì | Thành phố
Bộ thủ | 酉 | yǒu | Rượu
Bộ thủ | 釆 | biàn | Phân biệt
Bộ thủ | 里 | lǐ | Làng
Bộ thủ | 金 | jīn | Vàng, kim loại
Bộ thủ | 長 | cháng | Dài
Bộ thủ | 門 | mén | Cổng
Bộ thủ | 阜 | fù | Đống đất
Bộ thủ | 隶 | lì | Nô lệ
Bộ thủ | 隹 | zhuī | Chim cộc
Bộ thủ | 雨 | yǔ | Mưa
Bộ thủ | 青 | qīng | Xanh
Bộ thủ | 非 | fēi | Sai
Bộ thủ | 面 | miàn | Mặt
Bộ thủ | 革 | gé | Da
Bộ thủ | 韋 | wéi | Da mềm
Bộ thủ | 韭 | jiǔ | Hẹ
Bộ thủ | 音 | yīn | Âm thanh
Bộ thủ | 頁 | yè | Trang giấy
Bộ thủ | 風 | fēng | Gió
Bộ thủ | 飛 | fēi | Bay
Bộ thủ | 食 | shí | Ăn
Bộ thủ | 首 | shǒu | Đầu
Bộ thủ | 香 | xiāng | Thơm
Bộ thủ | 馬 | mǎ | Ngựa
Bộ thủ | 骨 | gǔ | Xương
Bộ thủ | 高 | gāo | Cao
Bộ thủ | 髟 | biāo | Tóc dài
Bộ thủ | 鬥 | dòu | Đấu
Bộ thủ | 鬯 | chàng | Rượu cúng
Bộ thủ | 鬲 | gé | Lư hương
Bộ thủ | 魚 | yú | Cá
Bộ thủ | 鳥 | niǎo | Chim
Bộ thủ | 鹿 | lù | Hươu
Bộ thủ | 麥 | mài | Lúa mì
Bộ thủ | 麻 | má | Gai cây lan
Bộ thủ | 黃 | huáng | Vàng
Bộ thủ | 黍 | shǔ | Gạo nếp
Bộ thủ | 黑 | hēi | Đen
Bộ thủ | 黹 | zhǐ | Thêu
Bộ thủ | 黽 | mǐn | Ếch
Bộ thủ | 鼎 | dǐng | Nồi đồng
Bộ thủ | 鼓 | gǔ | Trống
Bộ thủ | 鼠 | shǔ | Chuột
Bộ thủ | 鼻 | bí | Mũi
Bộ thủ | 齊 | qí | Ngăn nắp
Bộ thủ | 齒 | chǐ | Răng
Bộ thủ | 龍 | lóng | Rồng
Bộ thủ | 龜 | guī | Rùa
Bộ thủ | 龠 | yuè | Sáo
`;

function parseLines(raw: string): DefaultVocabularyItem[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split('|').map((part) => part.trim());
      if (parts.length < 4) {
        throw new Error(`Invalid default vocabulary line at ${index + 1}: ${line}`);
      }

      return {
        id: `fallback-${index + 1}`,
        lesson: parts[0],
        hanzi: parts[1],
        pinyin: parts[2],
        meaning: parts[3],
      };
    });
}

export const DEFAULT_VOCABULARY: DefaultVocabularyItem[] = parseLines(DEFAULT_VOCAB_TEXT);
export const DEFAULT_LESSON_COUNT = DEFAULT_VOCABULARY.filter((item) => item.lesson === 'Bộ thủ').length;